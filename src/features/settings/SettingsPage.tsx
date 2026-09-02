import { Link } from 'react-router-dom'
import { buildInfo, useAppUpdate } from '../../lib/appUpdate'
import { useCategories, useDays, useExercises, useGyms, useWarmups } from '../../lib/hooks'
import { useInstall } from '../../lib/install'
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
  const warmups = useWarmups()
  const canInstall = useInstall((s) => s.canInstall)
  const isInstalled = useInstall((s) => s.isInstalled)
  const platform = useInstall((s) => s.platform)
  const updateStatus = useAppUpdate((s) => s.status)

  // The row says what the install screen can actually do here, so tapping it is
  // never a dead end — iOS has no install button, only instructions.
  const installSub = isInstalled
    ? 'Já instalado neste aparelho'
    : canInstall
      ? 'Adicione o MyOneGym à tela inicial'
      : platform === 'ios'
        ? 'Veja como adicionar à tela inicial'
        : 'Como abrir o app fora do navegador'

  // Same rule as the install row: say what the screen can do here, so that
  // tapping it is never a dead end.
  const updateSub =
    updateStatus === 'unsupported'
      ? `Versão ${buildInfo.version}`
      : `Versão ${buildInfo.version} · procure uma mais nova`

  return (
    <>
      <header className="appbar">
        {/* CHANGED: was a hardcoded 16px, which bypassed --fs-* entirely and so
            never followed the user's Aparência setting. */}
        <h1>Configurações</h1>
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
          <NavRow to="/settings/warmups" icon="stretching" title="Aquecimentos" sub="Imagens, vídeos ou links de preparo" meta={warmups?.length} />
        </div>

        <div className="group-label">App</div>
        <div className="group">
          <NavRow to="/settings/install" icon="device-mobile" title="Instalar app" sub={installSub} />
          <NavRow to="/settings/update" icon="refresh" title="Atualizar app" sub={updateSub} />
        </div>

        <div className="group-label">Aparência</div>
        <div className="group">
          <NavRow to="/settings/appearance" icon="text-size" title="Aparência" sub="Tamanho da fonte do app" />
        </div>

        <div className="group-label">Assistente</div>
        <div className="group">
          <NavRow
            to="/settings/assistant"
            icon="sparkles"
            title="Assistente (IA)"
            sub="Converse para reorganizar exercícios, categorias e dias"
          />
        </div>

        <div className="group-label">Dados</div>
        <div className="group">
          <NavRow to="/settings/data" icon="database" title="Backup" sub="Gerar exemplo · exportar · importar backup" />
        </div>

        {/* CHANGED: the old copy said "todos os dados ficam apenas neste
            dispositivo", which stopped being true the moment the assistant
            could send the catalog to the Gemini API. The carve-out is named
            instead of quietly dropped — the claim still holds for everything
            else, and that is worth keeping. */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '16px 8px 0' }}>
          Seus dados ficam neste dispositivo (IndexedDB). Sem login e sem servidor — só o
          Assistente (IA), se você usar, envia categorias, exercícios e dias para a API do Gemini.
        </p>
      </main>

      <TabBar active="settings" />
    </>
  )
}
