import { useEffect, useRef, useState } from 'react'
import { embedLinkLabel, embedMediaKind, embedUrlWithRange, isPortraitEmbed } from '../lib/embedMedia'
import { isEndedMessage, listenCommand, playCommand, seekCommand } from '../lib/youtubeLoop'
import { Icon } from './Icon'
import './media-viewer.css'

/** One thing the viewer can page to: a warm-up, or an exercise video. */
export interface MediaItem {
  url: string
  /** Shown in the bar, and in the failure state — the media alone may not say
   *  what it is. */
  name: string
  /** Seconds, honoured only where the provider takes them (see
   *  `supportsTimeRange`). A warm-up never carries these. */
  startSec?: number
  endSec?: number
  /**
   * Repeat when it reaches the end — a trimmed segment repeats as the segment.
   *
   * Per item rather than per viewer: an execution video is watched over and over
   * to read the movement, and a warm-up is not, so the warm-up simply never sets
   * it and keeps behaving as it always did.
   */
  loop?: boolean
  /**
   * Start playing on its own, **muted** — browsers decline an audible autoplay,
   * so asking for one would just leave the video stopped.
   *
   * Also per item, and for a sharper reason than `loop`: a warm-up is reached by
   * a button and must not spend the user's data before they ask, while the
   * videos tab IS the pager — opening it is already the asking. Only the caller
   * knows which of the two it is.
   */
  autoplay?: boolean
}

/**
 * Pager over external media — one item at a time, arrows floating over the
 * media, wrapping past the ends.
 *
 * Two presentations, and **`onClose` is what picks between them**:
 *
 * - **on the page** (no `onClose`), for the Vídeos tab, which *is* the pager:
 *   opening the tab is already the act of opening the videos, so there is
 *   nothing to dismiss, no page behind to lock, and no reason to claim the
 *   arrow keys — they belong to the screen it shares.
 * - **overlay** (with `onClose`), for a video opened from a list — the
 *   read-only exercise view. A modal dialog: `role="dialog"`, `aria-modal`,
 *   close in the top bar, the page behind locked, and the arrow keys bound,
 *   because a pager that only answers to taps cannot be used one-handed on a
 *   desktop.
 *
 * Deriving the mode from `onClose` rather than from a separate boolean is what
 * makes the broken combination unrepresentable: there is no way to ask for a
 * dialog and forget to give it a way out.
 *
 * CHANGED: the overlay was **removed** when warm-ups went, on the grounds that
 * a mode with no caller can only rot. The read-only exercise view brought a
 * caller back, so it returns — with the mode now derived instead of passed, and
 * with `initialIndex`, which the old one had no use for because its opener had
 * no list to click into.
 *
 * It wraps: past the last item comes the first. Unlike the exercise detail's
 * Voltar/Avançar — which steps through a day and stops at its ends, because
 * "there is no next exercise" is real information — a stack of videos has no
 * position in a routine, so looping is the cheaper way round to the one you
 * wanted. The arrows float **over** the media rather than beside it, which
 * gives the media the full width; that matters most for a vertical Short or reel.
 */
export function MediaViewer({
  items,
  title = 'Mídia',
  initialIndex = 0,
  onClose,
}: {
  items: MediaItem[]
  title?: string
  /** Which item to open on — the one that was clicked in a list. */
  initialIndex?: number
  /** Given only by the overlay caller; its presence IS the overlay. */
  onClose?: () => void
}) {
  const total = items.length
  const overlay = onClose != null
  const [i, setI] = useState(initialIndex)
  const current = items[Math.min(i, total - 1)]

  // Escape closes, arrows page. Bound on the window because the focused element
  // could be the video's own controls — and NOT bound on the page presentation,
  // which shares the screen with everything else and would be stealing keys
  // that belong to it.
  useEffect(() => {
    if (!overlay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowRight') setI((n) => (n + 1) % total)
      else if (e.key === 'ArrowLeft') setI((n) => (n - 1 + total) % total)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay, onClose, total])

  // The page behind must not scroll under the overlay. On the page presentation
  // there is no page behind — locking the body would freeze the screen the
  // pager sits on.
  useEffect(() => {
    if (!overlay) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [overlay])

  if (!current) return null

  return (
    <div
      className={`wu-viewer${overlay ? ' overlay' : ''}`}
      role={overlay ? 'dialog' : 'group'}
      aria-modal={overlay ? true : undefined}
      aria-label={title}
    >
      <header className="wu-bar">
        <span className="wu-title">{current.name}</span>
        <span className="wu-count" aria-live="polite">
          {i + 1} de {total}
        </span>
        {overlay && (
          <button className="icon-btn ghost wu-close" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        )}
      </header>

      <div className="wu-stage">
        <ViewerMedia item={current} />
      </div>

      {/* Floating over the media, and only when there is somewhere to go: with a
          single warm-up a loop of one would be two controls that visibly do
          nothing. */}
      {total > 1 && (
        <>
          <button
            className="wu-nav prev"
            aria-label="Anterior"
            onClick={() => setI((n) => (n - 1 + total) % total)}
          >
            <Icon name="chevron-left" />
          </button>
          <button
            className="wu-nav next"
            aria-label="Próximo"
            onClick={() => setI((n) => (n + 1) % total)}
          >
            <Icon name="chevron-right" />
          </button>
        </>
      )}
    </div>
  )
}

/** One item, presented as its URL says it should be. */
function ViewerMedia({ item }: { item: MediaItem }) {
  const kind = embedMediaKind(item.url)
  const [failed, setFailed] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => setFailed(false), [item.url])

  // Loop the SEGMENT, not the video. `loop=1&playlist=<id>` restarts at zero and
  // drops the trim (see `embedUrlWithRange`), so the restart is driven here: the
  // player reports "ended" — which, with an `end`, is the end of the segment —
  // and is sent back to the start of it.
  useEffect(() => {
    if (!item.loop) return
    const onMessage = (e: MessageEvent) => {
      // Only this item's own frame, and only its ended event. Any other page on
      // the app could be posting messages of its own.
      if (e.source !== frame.current?.contentWindow) return
      if (!isEndedMessage(e.data)) return
      const win = frame.current?.contentWindow
      win?.postMessage(seekCommand(item.startSec ?? 0), '*')
      win?.postMessage(playCommand(), '*')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [item.loop, item.startSec, item.url])

  if (failed) {
    // Two things land here: media that is remote and unreachable (normal in an
    // offline-first app), and a URL that was never an image to begin with —
    // since image is what anything unrecognised is optimistically tried as.
    // Either way the name identifies it and the address stays reachable.
    return (
      <div className="wu-failed">
        <Icon name="photo-off" />
        <p>Não foi possível exibir “{item.name}” aqui.</p>
        <a className="btn subtle" href={item.url} target="_blank" rel="noopener noreferrer">
          <Icon name="external-link" /> Abrir {embedLinkLabel(item.url)}
        </a>
      </div>
    )
  }

  if (kind === 'video') {
    return (
      <video
        className="wu-media"
        src={item.url}
        controls
        loop={item.loop}
        autoPlay={item.autoplay}
        // Muted is the price of autoplay, not a taste: browsers decline an
        // audible one.
        muted={item.autoplay}
        // No pre-download unless it is about to play anyway: a warm-up must not
        // spend the user's mobile data before they ask for it.
        preload={item.autoplay ? 'auto' : 'none'}
        playsInline
        onError={() => setFailed(true)}
      />
    )
  }

  if (kind === 'embed') {
    // A provider with a real embed URL (YouTube, Vimeo, Instagram). The watch
    // page itself refuses to be framed; the player URL does not — see `embedUrl`.
    return (
      <iframe
        ref={frame}
        onLoad={() => {
          // The player only reports its state once asked to. Nothing happens
          // for a provider that is not YouTube — it simply ignores the message.
          if (item.loop) frame.current?.contentWindow?.postMessage(listenCommand(), '*')
        }}
        className={`wu-media wu-embed${isPortraitEmbed(item.url) ? ' portrait' : ''}`}
        // The user's own start/end, applied where the provider takes them —
        // one function decides that, so the form can never offer a range this
        // ignores. See `supportsTimeRange`.
        src={embedUrlWithRange(item.url, item) ?? undefined}
        title={item.name}
        // `autoplay` is granted only to an item that asked for it: without the
        // permission the player's own `autoplay=1` is refused by the frame.
        allow={`encrypted-media; picture-in-picture; fullscreen${
          item.autoplay ? '; autoplay' : ''
        }`}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    )
  }

  // Everything else is shown as an image — the useful guess, since plenty of
  // real image URLs carry no extension. If the guess is wrong the `onError`
  // above catches it and offers the address instead.
  return (
    <img className="wu-media" src={item.url} alt={item.name} onError={() => setFailed(true)} />
  )
}
