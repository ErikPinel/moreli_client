import { describe, expect, it } from 'vitest'
import { formatIsraeliDate, parseIsraeliDate, lessonStart, startTimesForDate } from './lesson-time'
import type { AvailabilitySlotDto } from '../types/api'

describe('Israel-local lesson requests', () => {
  it('accepts exact Israeli date text and formats confirmation dates', () => {
    expect(parseIsraeliDate('14/09/2026')).toBe('2026-09-14')
    expect(formatIsraeliDate('2026-09-14')).toBe('14/09/2026')
    expect(parseIsraeliDate('29/02/2028')).toBe('2028-02-29')
    for (const value of ['31/02/2026', '29/02/2026', '09/14/2026', '1/9/2026', '2026-09-14', '']) expect(parseIsraeliDate(value)).toBeNull()
  })
  it('does not offer times on days outside weekly availability', () => {
    const slots = [{ day_of_week: 2, start_time: '16:00:00', end_time: '18:00:00', is_active: true }] as AvailabilitySlotDto[]
    expect(startTimesForDate(slots, '2030-01-02', 60)).toEqual([])
    expect(startTimesForDate(slots, '', 60)).toEqual([])
  })
  it('uses Israel timezone independent of browser timezone', () => {
    expect(lessonStart('2030-01-01', '16:00').toISOString()).toBe('2030-01-01T14:00:00.000Z')
    expect(lessonStart('2030-07-01', '16:00').toISOString()).toBe('2030-07-01T13:00:00.000Z')
  })
  it('does not offer starts that exceed the selected duration', () => {
    const slots = [{ day_of_week: 2, start_time: '16:00:00', end_time: '18:00:00', is_active: true }] as AvailabilitySlotDto[]
    expect(startTimesForDate(slots, '2030-01-01', 120)).toEqual(['16:00'])
    expect(startTimesForDate(slots, '2030-01-01', 90)).toEqual(['16:00', '16:30'])
  })
  it('rejects invalid dates instead of producing a broken request', () => {
    expect(() => lessonStart('invalid', '16:00')).toThrow()
  })
})