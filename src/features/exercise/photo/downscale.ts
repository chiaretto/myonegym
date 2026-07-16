import { MAX_EDGE, fitDimensions } from './fitDimensions'

/** JPEG quality for stored photos — plenty to read a seat number off a machine. */
const QUALITY = 0.8
const TYPE = 'image/jpeg'

export interface DownscaledPhoto {
  bytes: ArrayBuffer
  type: string
  width: number
  height: number
}

export class PhotoError extends Error {}

/**
 * Decode a picked file to something drawable.
 *
 * `createImageBitmap` is preferred for two reasons: it decodes off the main
 * thread (a 12 MP JPEG blocks it for a noticeable beat otherwise), and
 * `imageOrientation: 'from-image'` applies the **EXIF rotation**. That matters:
 * a canvas re-encode drops EXIF, so without this a photo taken in portrait would
 * be stored on its side. The `<img>` fallback gets orientation for free — the
 * browser applies EXIF when rendering — at the cost of a main-thread decode.
 */
async function decode(file: Blob): Promise<{
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Fall through — Safari has shipped partial createImageBitmap support.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new PhotoError('Não foi possível ler a imagem.'))
      el.src = url
    })
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

/**
 * Downscale and re-encode a picked photo for storage. A phone photo is 3–12 MB;
 * storing originals would exhaust the origin's quota within a couple of dozen
 * exercises. The result is capped at `MAX_EDGE` on its long edge and re-encoded
 * as JPEG.
 *
 * Throws `PhotoError` for anything unreadable — a broken record must never be
 * persisted, and the failure must never be silent.
 */
export async function downscalePhoto(file: File | Blob): Promise<DownscaledPhoto> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new PhotoError('O arquivo escolhido não é uma imagem.')
  }

  const { source, width, height, release } = await decode(file)
  try {
    if (!(width > 0) || !(height > 0)) {
      throw new PhotoError('Não foi possível ler a imagem.')
    }
    const size = fitDimensions(width, height, MAX_EDGE)

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoError('Canvas 2D não disponível.')
    ctx.drawImage(source, 0, 0, size.width, size.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, TYPE, QUALITY),
    )
    if (!blob) throw new PhotoError('Não foi possível processar a imagem.')

    return { bytes: await blob.arrayBuffer(), type: TYPE, width: size.width, height: size.height }
  } finally {
    release()
  }
}
