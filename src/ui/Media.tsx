import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface MediaProps {
  url?: string
  alt: string
  className?: string
}

/**
 * Renders an exercise's media (static image or animated GIF). Falls back to a
 * placeholder glyph when the URL is missing or fails to load. An <img> plays
 * animated GIFs automatically.
 */
export function Media({ url, alt, className }: MediaProps) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [url])

  if (!url || broken) {
    return (
      <div className={`media-fallback ${className ?? ''}`} role="img" aria-label={alt}>
        <Icon name="photo" />
      </div>
    )
  }
  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}
