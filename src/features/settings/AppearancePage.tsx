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
  const setFontScale = useSettings((s) => s.setFontScale)
  const reset = useSettings((s) => s.reset)
  const pct = Math.round(fontScale * 100)

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
          <button className="btn subtle" style={{ marginTop: 14 }} onClick={reset}>
            <Icon name="refresh" /> Restaurar padrão
          </button>
        </section>

        <div className="group-label">Prévia</div>
        <section className="group fs-preview">
          <span className="p-title">Rosca Direta</span>
          <span className="p-body">
            Ajuste o tamanho até ficar confortável de ler no seu celular — a mudança vale para todo o app.
          </span>
          <span className="p-badge">22,5 KG</span>
        </section>
      </main>
    </>
  )
}
