import { useState } from 'react'
import { useGyms } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { Icon } from '../../ui/Icon'
import { Sheet } from '../../ui/Sheet'

/** Compact active-gym pill that opens a picker; shows a hint when no gym exists. */
export function GymSelector() {
  const gyms = useGyms()
  const { activeGymId, setActiveGym } = useActiveGym()
  const [open, setOpen] = useState(false)

  const active = gyms?.find((g) => g.id === activeGymId)

  if (!gyms) return null

  return (
    <>
      {/* CHANGED: dropped inline padding/font-size and the per-Icon size props.
          They overrode .chip/.chip.accent and, being px, did not follow
          --font-scale — so this pill stayed put while the rest of the app
          rescaled. The PNG glyphs size from the chip's own font-size. */}
      <button className="chip accent" onClick={() => setOpen(true)} aria-label="Trocar academia ativa">
        <i className="png-ic pi-building" aria-hidden />
        {active ? active.name : 'Sem academia'}
        <i className="png-ic pi-chevron-down" aria-hidden />
      </button>

      {open && (
        <Sheet title="Academia ativa" onClose={() => setOpen(false)}>
          {gyms.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Nenhuma academia cadastrada. Crie uma em Configurações → Academias.
            </p>
          )}
          <div className="group">
            {gyms.map((g) => (
              <button
                key={g.id}
                className="row"
                onClick={() => {
                  setActiveGym(g.id!)
                  setOpen(false)
                }}
              >
                <span className="row-ic">
                  <Icon name="building" />
                </span>
                <span className="row-body">
                  <span className="row-title">{g.name}</span>
                </span>
                {g.id === activeGymId && <Icon name="check" className="chev" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}
