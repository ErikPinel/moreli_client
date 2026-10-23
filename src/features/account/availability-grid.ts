import type { AvailabilitySlotDto } from '@/types/api'

export type EditableAvailability = Pick<AvailabilitySlotDto, 'day_of_week' | 'start_time' | 'end_time'>
export const availabilityDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const defaultAvailability = (): EditableAvailability[] => Array.from({ length: 5 }, (_, day_of_week) => ({ day_of_week, start_time: '09:00', end_time: '21:00' }))
export const timeMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const timeText = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function availabilitySegments(slots: EditableAvailability[], day: number, hour: number) {
  return slots.filter(slot => slot.day_of_week === day && timeMinutes(slot.end_time) > timeMinutes(slot.start_time))
    .map(slot => ({ start: Math.max(timeMinutes(slot.start_time), hour * 60), end: Math.min(timeMinutes(slot.end_time), (hour + 1) * 60) }))
    .filter(segment => segment.end > segment.start)
}
export function toggleAvailabilityHour(slots: EditableAvailability[], day: number, hour: number): EditableAvailability[] {
  const start = hour * 60
  const end = start + 60
  const ranges = slots.filter(slot => slot.day_of_week === day).map(slot => ({ start: timeMinutes(slot.start_time), end: timeMinutes(slot.end_time) })).sort((a, b) => a.start - b.start)
  const merged: typeof ranges = []
  for (const range of ranges) {
    const previous = merged[merged.length - 1]
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }
  const covered = merged.some(range => range.start <= start && range.end >= end)
  const changed = covered ? merged.flatMap(range => {
    if (range.end <= start || range.start >= end) return [range]
    return [{ start: range.start, end: start }, { start: end, end: range.end }].filter(part => part.end > part.start)
  }) : [...merged, { start, end }].sort((a, b) => a.start - b.start)
  const normalized: typeof ranges = []
  for (const range of changed) {
    const previous = normalized[normalized.length - 1]
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else normalized.push({ ...range })
  }
  return [...slots.filter(slot => slot.day_of_week !== day), ...normalized.map(range => ({ day_of_week: day, start_time: timeText(range.start), end_time: timeText(range.end) }))]
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
}
