import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { setCardioHidden } from '../../db/repos'
import { exerciseCategoryNames } from '../../lib/days'
import { useCardioExercises, useCategoryMap, useHiddenCardioIds } from '../../lib/hooks'
import { BackBar } from '../../ui/Chrome'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import './cardio-settings.css'

/**
 * Settings → Cardio: which cardio exercises the Cardio tab lists.
 *
 * It exists because of the **official** catalog: those exercises cannot be
 * edited or deleted, and their list grows by the publisher's decision, not the
 * user's. Someone who only ever does the treadmill should not scroll past seven
 * sports to reach it.
 *
 * Every cardio exercise is here, hidden or not — this is the one screen whose
 * job is to show the hidden ones. A switch per row, saved on the tap: it is a
 * preference per line, not a form, so there is nothing to submit.
 *
 * Hiding touches the tab's list and nothing else (see `HiddenCardio`).
 */
export function CardioSettingsPage() {
  const exercises = useCardioExercises()
  const hidden = useHiddenCardioIds()
  const catMap = useCategoryMap()
  const toast = useToast()

  const onToggle = async (exerciseId: number, show: boolean) => {
    try {
      await setCardioHidden(exerciseId, !show, db)
    } catch {
      toast('Não foi possível salvar.')
    }
  }

  return (
    <>
      <BackBar title="Cardio" to="/settings" />
      <main className="screen">
        {/* Nothing is claimed until BOTH reads have answered: a switch painted
            "on" from a provisional "nothing hidden" would flip a frame later. */}
        {exercises === undefined || hidden === undefined ? null : exercises.length === 0 ? (
          <div className="empty">
            <span className="big">🏃</span>
            <h2>Nenhum cardio ainda</h2>
            <p>
              Cadastre um exercício do tipo <strong>Cardio</strong> e escolha aqui se ele aparece na
              aba Cardio.
            </p>
            <Link className="btn primary" to="/settings/exercises/new">
              <Icon name="plus" /> Novo exercício
            </Link>
          </div>
        ) : (
          <>
            <p className="cardio-set-intro">
              Escolha o que aparece na aba Cardio. Um exercício oculto continua no catálogo, no
              histórico e na Consistência.
            </p>
            <ul className="cardio-set-list">
              {exercises.map((e) => {
                const cats = exerciseCategoryNames(e, catMap)
                const shown = !hidden.has(e.id!)
                return (
                  <li key={e.id} className={`cardio-set-row${shown ? '' : ' off'}`}>
                    <Media className="thumb" url={e.mediaUrl} alt={e.name} />
                    <span className="cardio-set-body">
                      <span className="cardio-set-name">{e.name}</span>
                      {cats.length > 0 && (
                        <span className="cardio-set-cat">{cats.join(' · ')}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      className={`switch${shown ? ' on' : ''}`}
                      aria-checked={shown}
                      aria-label={`Mostrar ${e.name} na aba Cardio`}
                      onClick={() => onToggle(e.id!, !shown)}
                    >
                      <span className="switch-knob" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
