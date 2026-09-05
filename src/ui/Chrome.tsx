import { Link, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

/**
 * CHANGED: the three tab glyphs come from the brand artwork (PNG used as a CSS
 * mask) instead of the Tabler webfont, because these are the icons the identity
 * sheet actually draws. They take their colour from `currentColor`, so one asset
 * serves both the accent (active) and the muted (inactive) state.
 *
 * The rest of the app stays on Tabler: it uses 34 glyphs across 77 call sites and
 * the brand set covers ~16 concepts, so this complements the webfont rather than
 * replacing it.
 */
export function TabBar({ active }: { active: 'home' | 'cardio' | 'sessions' | 'settings' }) {
  return (
    <nav className="tabbar">
      <Link to="/" className={active === 'home' ? 'active' : ''}>
        <i className="png-ic pi-home" aria-hidden />
        Treinos
      </Link>
      {/* Tabler glyph among three brand PNGs: the brand set covers ~16 concepts
          and cardio is not one of them. Visible up close, and swapping it for
          brand art later is one file. */}
      <Link to="/cardio" className={active === 'cardio' ? 'active' : ''}>
        <Icon name="heartbeat" aria-hidden />
        Cardio
      </Link>
      <Link to="/sessions" className={active === 'sessions' ? 'active' : ''}>
        <i className="png-ic pi-history" aria-hidden />
        Histórico
      </Link>
      {/* Abbreviated, and only here: four labels share one row on a phone, and
          "Configurações" is the one that forces the others to shrink. The screen
          it opens keeps the whole word — that heading has the room. */}
      <Link to="/settings" className={active === 'settings' ? 'active' : ''}>
        <i className="png-ic pi-settings" aria-hidden />
        Config
      </Link>
    </nav>
  )
}

export function BackBar({ title, to }: { title: string; to?: string }) {
  const nav = useNavigate()
  return (
    <header className="appbar">
      <button className="icon-btn ghost" aria-label="Voltar" onClick={() => (to ? nav(to) : nav(-1))}>
        <Icon name="arrow-left" />
      </button>
      {/* CHANGED: sizing moved to `.appbar h1` in global.css. Inline styles beat
          the stylesheet, so a redesign of the appbar could never reach this. */}
      <h1>{title}</h1>
    </header>
  )
}
