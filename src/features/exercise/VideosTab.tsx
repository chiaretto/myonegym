import type { Exercise } from '../../db/types'
import { embedLinkLabel } from '../../lib/embedMedia'
import { formatRange } from '../../lib/videoTime'
import { MediaViewer } from '../../ui/MediaViewer'
import '../../ui/media-viewer.css'
import './exercise.css'

/**
 * The exercise's execution videos — the tab **is** the carousel.
 *
 * No listing in front of it: opening the tab is already the act of asking for
 * the videos, and a list would put a second tap between the question and the
 * answer. The pager's own counter and name say which one is showing, which is
 * what the list was there to say; the arrows do the rest.
 *
 * The same component serves the catalogue detail and the in-session one: the
 * videos belong to the **exercise**, not to `(gym, exercise)` like the note and
 * the photos, so there is no active gym to scope by and nothing to prompt for.
 */
export function VideosTab({ exercise }: { exercise: Exercise | undefined }) {
  // Undefined means the exercise has not been read yet. Claiming "no videos"
  // before knowing is the empty-state lie app-foundation rules out.
  if (!exercise) return null
  const videos = exercise.videos ?? []

  if (videos.length === 0) {
    return (
      <div className="empty">
        <span className="big">🎬</span>
        <h2>Nenhum vídeo ainda</h2>
      </div>
    )
  }

  return (
    <MediaViewer
      title="Vídeos"
      items={videos.map((v) => ({
        url: v.url,
        // The label when there is one; otherwise the provider, which at least
        // says where this came from.
        name: [v.title || embedLinkLabel(v.url), formatRange(v)].filter(Boolean).join(' · '),
        startSec: v.startSec,
        endSec: v.endSec,
        // An execution video is watched over and over to read the movement —
        // having to restart it by hand each pass is the friction this removes.
        loop: true,
        // Opening this tab IS the request to watch, so the "do not play before
        // asked" rule the warm-ups follow has nothing left to protect here. It
        // starts muted, which is what the browsers allow — and what anyone
        // checking a grip in a gym wanted anyway.
        autoplay: true,
      }))}
    />
  )
}
