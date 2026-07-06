interface IconProps {
  name: string
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

/** Tabler webfont glyph, e.g. <Icon name="barbell" />. */
export function Icon({ name, size, className, ...rest }: IconProps) {
  return (
    <i
      className={`ti ti-${name}${className ? ` ${className}` : ''}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden={rest['aria-hidden'] ?? true}
    />
  )
}
