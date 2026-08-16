import { useEffect, useState } from 'react'
import type { Warmup } from '../../db/types'
import {
  isPortraitEmbed,
  warmupEmbedUrl,
  warmupLinkLabel,
  warmupMediaKind,
} from '../../lib/warmupMedia'
import { Icon } from '../../ui/Icon'
import './warmup.css'

/**
 * Full-screen pager over an exercise's warm-ups.
 *
 * A screen rather than a `Sheet`: the sheet is a drawer for short actions, and
 * this is content with navigation of its own. It borrows what the sheet
 * established — `role="dialog"`, `aria-modal`, Escape to close — and adds the
 * arrow keys, because a pager that only answers to taps is a pager you cannot
 * use one-handed on a desktop.
 *
 * It wraps: past the last item comes the first. Unlike the exercise detail's
 * Voltar/Avançar — which steps through a day and stops at its ends, because
 * "there is no next exercise" is real information — a warm-up stack has no
 * position in a routine, so looping is the cheaper way round to the one you
 * wanted. The arrows float **over** the media rather than beside it, which
 * gives the media the full width; that matters most for a vertical Short.
 */
export function WarmupViewer({
  warmups,
  onClose,
  title = 'Aquecimento',
}: {
  warmups: Warmup[]
  onClose: () => void
  title?: string
}) {
  const [i, setI] = useState(0)
  const total = warmups.length
  const current = warmups[Math.min(i, total - 1)]

  // Escape closes, arrows page. Bound on the window because the focused element
  // could be the video's own controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI((n) => (n + 1) % total)
      else if (e.key === 'ArrowLeft') setI((n) => (n - 1 + total) % total)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, total])

  // The page behind must not scroll under the overlay.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  if (!current) return null

  return (
    <div className="wu-viewer" role="dialog" aria-modal="true" aria-label={title}>
      <header className="wu-bar">
        <span className="wu-title">{current.name}</span>
        <span className="wu-count" aria-live="polite">
          {i + 1} de {total}
        </span>
        <button className="icon-btn ghost wu-close" aria-label="Fechar" onClick={onClose}>
          <Icon name="x" />
        </button>
      </header>

      <div className="wu-stage">
        <WarmupMedia warmup={current} />
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

/** One warm-up, presented as its URL says it should be. */
function WarmupMedia({ warmup }: { warmup: Warmup }) {
  const kind = warmupMediaKind(warmup.url)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [warmup.url])

  if (failed) {
    // Two things land here: media that is remote and unreachable (normal in an
    // offline-first app), and a URL that was never an image to begin with —
    // since image is what anything unrecognised is optimistically tried as.
    // Either way the name identifies it and the address stays reachable.
    return (
      <div className="wu-failed">
        <Icon name="photo-off" />
        <p>Não foi possível exibir “{warmup.name}” aqui.</p>
        <a className="btn subtle" href={warmup.url} target="_blank" rel="noopener noreferrer">
          <Icon name="external-link" /> Abrir {warmupLinkLabel(warmup.url)}
        </a>
      </div>
    )
  }

  if (kind === 'video') {
    return (
      <video
        className="wu-media"
        src={warmup.url}
        controls
        // No autoplay and no pre-download: a warm-up must not spend the user's
        // mobile data before they ask for it.
        preload="none"
        playsInline
        onError={() => setFailed(true)}
      />
    )
  }

  if (kind === 'embed') {
    // A provider with a real embed URL (YouTube, Vimeo). The watch page itself
    // refuses to be framed; the player URL does not — see `warmupEmbedUrl`.
    return (
      <iframe
        className={`wu-media wu-embed${isPortraitEmbed(warmup.url) ? ' portrait' : ''}`}
        src={warmupEmbedUrl(warmup.url) ?? undefined}
        title={warmup.name}
        // No `allow="autoplay"`: the same rule the local video follows — a
        // warm-up must not start playing or spend data before it is asked to.
        allow="encrypted-media; picture-in-picture; fullscreen"
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
    <img className="wu-media" src={warmup.url} alt={warmup.name} onError={() => setFailed(true)} />
  )
}
