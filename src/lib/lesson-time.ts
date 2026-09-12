import { DateTime } from 'luxon'
import type { AvailabilitySlotDto } from '../types/api'

const zone = 'Asia/Jerusalem'

export function parseIsraeliDate(value: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null
  const date = DateTime.fromFormat(value, 'dd/MM/yyyy', { zone, locale: 'he' })
  return date.isValid && date.toFormat('dd/MM/yyyy') === value ? date.toISODate() : null
}

export function formatIsraeliDate(value: string): string {
  const date = DateTime.fromISO(value, { zone })
  return date.isValid ? date.toFormat('dd/MM/yyyy') : ''
}

export function lessonStart(date: string, time: string) {
  const local = DateTime.fromISO(`${date}T${time}`, { zone })
  if (!local.isValid || local.toFormat('yyyy-MM-dd HH:mm') !== `${date} ${time}` || local.getPossibleOffsets().length !== 1) {
    throw new Error('Choose an unambiguous Israel-local time')
  }
  return local.toJSDate()
}

export function tomorrow() {
  return DateTime.now().setZone(zone).plus({ days: 1 }).toISODate()!
}

export function upcomingDates(slots: AvailabilitySlotDto[]) {
  if (!slots.length) return []
  return Array.from({ length: 28 }, (_, index) => DateTime.now().setZone(zone).startOf('day').plus({ days: index + 1 }))
    .filter((date) => slots.some((slot) => slot.is_active && slot.day_of_week === date.weekday % 7))
    .map((date) => ({ value: date.toISODate()!, label: date.setLocale('he').toFormat('cccc d LLL') }))
}

export function startTimesForDate(slots: AvailabilitySlotDto[], date: string, duration: number) {
  const day = DateTime.fromISO(date, { zone }).weekday % 7
  const values = new Set<string>()
  for (const slot of slots.filter((slot) => slot.is_active && slot.day_of_week === day)) {
    const start = DateTime.fromISO(`${date}T${slot.start_time}`, { zone })
    const end = DateTime.fromISO(`${date}T${slot.end_time}`, { zone })
    for (let cursor = start; cursor.plus({ minutes: duration }) <= end; cursor = cursor.plus({ minutes: 30 })) {
      values.add(cursor.toFormat('HH:mm'))
    }
  }
  return [...values].sort()
}