import { ACCENTS, resolveAccent } from '../../state/accents'
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  useSettings,
} from '../../state/settings'
import { BackBar } from '../../ui/Chrome'
import { Icon } from '../../ui/Icon'
import './appearance.css'

export function AppearancePage() {
  const fontScale = useSettings((s) => s.fontScale)
  const accent = useSettings((s) => s.accent)
  const setFontScale = useSettings((s) => s.setFontScale)
  const setAccent = useSettings((s) => s.setAccent)
  const reset = useSettings((s) => s.reset)
  const pct = Math.round(fontScale * 100)
  const current = resolveAccent(accent)

  return (
    <>
      <BackBar title="Aparência" to="/settings" />
      <main className="screen">
        <div className="group-label">Tamanho da fonte</div>
        <section className="group fs-card">
          <div className="fs-value" aria-live="polite">
            {pct}%
          </div>
          <input
            className="fs-slider"
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={(e) => setFontScale(Number(e.target.value))}
            aria-label="Tamanho da fonte"
            aria-valuetext={`${pct}%`}
          />
          <div className="fs-ends">
            <span>{Math.round(FONT_SCALE_MIN * 100)}%</span>
            <span>{Math.round(FONT_SCALE_MAX * 100)}%</span>
          </div>
        </section>

        <div className="group-label">Cor de destaque</div>
        <section className="group ac-card">
          <div className="ac-grid" role="group" aria-label="Cor de destaque">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`ac-swatch${a.id === current.id ? ' on' : ''}`}
                style={{ background: `linear-gradient(180deg, ${a.accent}, ${a.accent2})` }}
                onClick={() => setAccent(a.id)}
                aria-label={a.name}
                aria-pressed={a.id === current.id}
              >
                {a.id === current.id && <Icon name="check" />}
              </button>
            ))}
          </div>
          <div className="ac-name" aria-live="polite">
            {current.name}
          </div>
          <div className="ac-note">
            Todas as cores têm o mesmo contraste da original, então nada fica difícil de ler.
          </div>
        </section>

        <div className="group-label">Prévia</div>
        <section className="group fs-preview">
          <span className="p-title">Rosca Direta</span>
          <span className="p-body">
            Ajuste o tamanho e a cor até ficar confortável de ler no seu celular — a mudança vale
            para todo o app.
          </span>
          <span className="p-badge accent">22,5 KG</span>
          <button className="btn primary p-cta">Iniciar</button>
        </section>

        <section className="group ac-reset">
          <button className="btn subtle" onClick={reset}>
            <Icon name="refresh" /> Restaurar padrão
          </button>
          <div className="ac-note">
            O logo, o ícone do app e a tela de abertura seguem a marca e continuam vermelhos.
          </div>
        </section>
      </main>
    </>
  )
}
