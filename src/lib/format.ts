import type { ExerciseKind, Unit, WeightHistory } from '../db/types'

/** pt-BR number: drop trailing zeros, comma decimal. 22.5 -> "22,5". */
export function fmtNumber(value: number): string {
  return value
    .toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function fmtWeight(value: number, unit: Unit): string {
  return `${fmtNumber(value)} ${unit}`
}

const DAY = 86_400_000

/** Relative pt-BR date label, e.g. "Hoje", "Há 2 semanas". */
export function relativeDate(ts: number, now = Date.now()): string {
  const days = Math.floor((now - ts) / DAY)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `Há ${days} dias`
  if (days < 14) return 'Há 1 semana'
  if (days < 30) return `Há ${Math.floor(days / 7)} semanas`
  if (days < 60) return 'Há 1 mês'
  if (days < 365) return `Há ${Math.floor(days / 30)} meses`
  return `Há ${Math.floor(days / 365)} ano(s)`
}

/** Short pt-BR day + month, e.g. "6 jul". */
export function fmtDayMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

/** Absolute pt-BR date, e.g. "16 jul 2026". Used where a relative label would
 *  rot — a shared image outlives the day it was made. */
export function fmtFullDate(ts: number): string {
  return new Date(ts)
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ')
}

/** Duration between two timestamps as "48 min" / "1 h 5 min". */
export function fmtDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * A *running* duration as a clock: "00:12:34", "01:04:07".
 *
 * Sibling of `fmtDuration`, not a replacement: that one rounds to the minute,
 * which is what a finished session wants ("48 min"). This one keeps the seconds
 * because it is read while it ticks — a counter that only moved once a minute
 * would look stopped.
 *
 * Seconds are truncated, never rounded: a session that started 0.9 s ago reads
 * 00:00:00, so the clock never shows a second that has not elapsed yet. Hours
 * grow past two digits rather than wrapping — a session left open overnight
 * should read as absurd, not as 00:03:00.
 */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * A short running duration, showing only the field that carries information:
 * **"SSs" under a minute** ("00s", "07s", "45s") and **"MM:SS" from a minute on**
 * ("01:00", "01:30", "12:05").
 *
 * Sibling of `fmtClock`, which carries hours. Hours are what a workout needs and
 * what a **rest between sets** never does — "00:00:45" is two fields of zero and
 * one of information — and by the same argument a rest of 45 seconds does not
 * need a minutes field either. Dropping it buys the digits that ARE meaningful
 * more room in a circle the size of a thumbprint, which is where this is read:
 * at arm's length, mid-set.
 *
 * The seconds carry a **unit** while they stand alone, because alone they are
 * ambiguous — "45" beside a clock glyph could as easily be minutes. From a
 * minute on the colon says what the fields are and the suffix would be noise,
 * so it goes.
 *
 * Both rules `fmtClock` established hold here, for the same reasons. Seconds are
 * truncated, never rounded, so the timer never shows a second that has not
 * elapsed. And the leading field — minutes, once there are any — grows past two
 * digits instead of wrapping: a timer someone forgot to stop should read as
 * absurd (100:00), not as freshly started (40:00).
 */
export function fmtLapse(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return m === 0 ? `${s}s` : `${String(m).padStart(2, '0')}:${s}`
}

/**
 * The whole answer a blocked play button gives: there is already a session
 * open, so this one cannot start. It names the kind that is running, not the
 * kind that was tapped — "cardio" on Home is the useful half of the sentence,
 * because it says where to go look for it.
 *
 * One function rather than a literal per screen: Home and Cardio both say this,
 * and two wordings would read as two different rules.
 */
export function busySessionMessage(kind: ExerciseKind): string {
  return `Você já tem um ${kind === 'cardio' ? 'cardio' : 'treino'} em andamento.`
}

export interface DeltaLabel {
  text: string
  direction: 'up' | 'down' | 'first' | 'unit'
}

/**
 * Label for a history row relative to the entry that precedes it in time
 * (`prev` = the chronologically older neighbour).
 */
export function historyDelta(entry: WeightHistory, prev: WeightHistory | undefined): DeltaLabel {
  if (!prev || entry.kind === 'first') return { text: '1º registro', direction: 'first' }
  if (entry.kind === 'unit') return { text: `→ ${entry.unit}`, direction: 'unit' }
  const diff = entry.value - prev.value
  if (diff === 0) return { text: '=', direction: 'unit' }
  const sign = diff > 0 ? '+' : '−'
  return {
    text: `${sign}${fmtNumber(Math.abs(diff))} ${entry.unit}`,
    direction: diff > 0 ? 'up' : 'down',
  }
}
