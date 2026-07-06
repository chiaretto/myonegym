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
      <button
        className="chip accent"
        style={{ padding: '6px 10px', fontSize: 12 }}
        onClick={() => setOpen(true)}
        aria-label="Trocar academia ativa"
      >
        <Icon name="building" size={13} />
        {active ? active.name : 'Sem academia'}
        <Icon name="chevron-down" size={13} />
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
