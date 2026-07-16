import type { Unit, WeightHistory } from '../db/types'

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
