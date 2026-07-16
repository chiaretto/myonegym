/** Longest edge a stored photo may have. Enough to read a machine's settings;
 *  small enough that a few dozen photos don't threaten the storage quota. */
export const MAX_EDGE = 1600

/**
 * Cap the long edge at `max`, preserving the aspect ratio. Never upscales — a
 * photo that is already small is stored as-is rather than blown up into a bigger,
 * blurrier file.
 *
 * Pure on purpose: it is the only part of the downscale pipeline that jsdom can
 * test (there is no 2D context), so all the arithmetic lives here.
 */
export function fitDimensions(
  width: number,
  height: number,
  max: number = MAX_EDGE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    throw new Error('Dimensões inválidas.')
  }
  const longest = Math.max(width, height)
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) }

  const scale = max / longest
  return {
    // The long edge lands exactly on `max`; the short edge rounds, and is
    // clamped to >= 1 so an extreme panorama never collapses to a 0-px side.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
