/** How the image actually reached the user — the caller toasts accordingly. */
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** "Dia 1" + 16 jul 2026 → "myonegym-dia-1-2026-07-16.png" */
export function shareFilename(dayName: string, ts: number): string {
  const slug =
    dayName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'treino'
  const d = new Date(ts)
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  return `myonegym-${slug}-${stamp}.png`
}

/** Same pattern as the backup export in `DataPage.tsx`. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Hands the PNG to the platform share sheet, falling back to a download where
 * sharing files isn't supported (desktop Chrome/Firefox, older iOS) — sharing
 * must never just fail.
 */
export async function shareSessionImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      // Dismissing the sheet is a non-event, not a failure.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }

  download(blob, filename)
  return 'downloaded'
}
