import { Link, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

export function TabBar({ active }: { active: 'home' | 'sessions' | 'settings' }) {
  return (
    <nav className="tabbar">
      <Link to="/" className={active === 'home' ? 'active' : ''}>
        <Icon name="home" className="ti" />
        Treinos
      </Link>
      <Link to="/sessions" className={active === 'sessions' ? 'active' : ''}>
        <Icon name="history" className="ti" />
        Sessões
      </Link>
      <Link to="/settings" className={active === 'settings' ? 'active' : ''}>
        <Icon name="settings" className="ti" />
        Configurações
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
      <h1 style={{ fontSize: 16 }}>{title}</h1>
    </header>
  )
}
