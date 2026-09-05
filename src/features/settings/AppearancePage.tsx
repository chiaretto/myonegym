import { ACCENTS, resolveAccent } from '../../state/accents'
import { SPLASHES, resolveSplash } from '../../state/splashes'
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
  const splash = useSettings((s) => s.splash)
  const setSplash = useSettings((s) => s.setSplash)
  const reset = useSettings((s) => s.reset)
  const pct = Math.round(fontScale * 100)
  const current = resolveAccent(accent)
  const currentSplash = resolveSplash(splash)

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

        <div className="group-label">Tela de abertura</div>
        <section className="group sp-card">
          <div className="sp-grid" role="group" aria-label="Tela de abertura">
            {SPLASHES.map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`sp-option${sp.id === currentSplash.id ? ' on' : ''}`}
                onClick={() => setSplash(sp.id)}
                aria-pressed={sp.id === currentSplash.id}
              >
                {/* The artwork itself as the preview — the same file the boot
                    screen paints, so what is picked is what will be seen. */}
                <img
                  className="sp-thumb"
                  src={`${import.meta.env.BASE_URL}${sp.file}`}
                  alt=""
                  loading="lazy"
                />
                <span className="sp-name">
                  {sp.name}
                  {sp.id === currentSplash.id && <Icon name="check" size={12} />}
                </span>
              </button>
            ))}
          </div>
          <div className="ac-note">
            Vale na <strong>próxima vez</strong> que o app abrir — a tela de abertura é pintada
            antes do app carregar, então a escolha de agora só alcança a próxima.
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
            O logo e o ícone do app seguem a marca e continuam vermelhos — a cor de destaque não
            os repinta, nem repinta a tela de abertura.
          </div>
        </section>
      </main>
    </>
  )
}
