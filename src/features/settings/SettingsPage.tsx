import { Link } from 'react-router-dom'
import { useCategories, useDays, useExercises, useGyms } from '../../lib/hooks'
import { Icon } from '../../ui/Icon'
import { TabBar } from '../../ui/Chrome'
import { GymSelector } from '../gym/GymSelector'

function NavRow({ to, icon, title, sub, meta }: { to: string; icon: string; title: string; sub: string; meta?: number }) {
  return (
    <Link className="row" to={to}>
      <span className="row-ic">
        <Icon name={icon} />
      </span>
      <span className="row-body">
        <span className="row-title">{title}</span>
        <span className="row-sub">{sub}</span>
      </span>
      {meta != null && <span className="row-meta">{meta}</span>}
      <Icon name="chevron-right" className="chev" />
    </Link>
  )
}

export function SettingsPage() {
  const gyms = useGyms()
  const cats = useCategories()
  const exs = useExercises()
  const days = useDays()

  return (
    <>
      <header className="appbar">
        <h1 style={{ fontSize: 16 }}>Configurações</h1>
        <span className="spacer" />
        <GymSelector />
      </header>

      <main className="screen">
        <div className="group-label">Cadastros</div>
        <div className="group">
          <NavRow to="/settings/gyms" icon="building" title="Academias" sub="Copie pesos ao criar uma nova" meta={gyms?.length} />
          <NavRow to="/settings/categories" icon="tags" title="Categorias" sub="Grupos musculares (editáveis)" meta={cats?.length} />
          <NavRow to="/settings/exercises" icon="barbell" title="Exercícios" sub="Nome, imagem/GIF e categoria" meta={exs?.length} />
          <NavRow to="/settings/days" icon="calendar-event" title="Dias de treino" sub="Selecione os exercícios de cada dia" meta={days?.length} />
        </div>

        <div className="group-label">Dados</div>
        <div className="group">
          <NavRow to="/settings/data" icon="database" title="Backup e compartilhamento" sub="Gerar exemplo · exportar · importar" />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '16px 8px 0' }}>
          Todos os dados ficam apenas neste dispositivo (IndexedDB). Sem login, sem servidor.
        </p>
      </main>

      <TabBar active="settings" />
    </>
  )
}
