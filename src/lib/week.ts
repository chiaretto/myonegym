/** Local-midnight timestamp of the Monday that starts the week containing `ts`.
 *  Used by the Home weekly training summary. */
export function startOfWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (dow + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return d.getTime()
}
