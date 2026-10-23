import { describe, expect, it } from 'vitest'
import { availabilitySegments, defaultAvailability, toggleAvailabilityHour } from './availability-grid'

describe('Hourly availability editor', () => {
  it('defaults to exactly Sunday–Thursday, 09–21', () => {
    expect(defaultAvailability()).toEqual([0, 1, 2, 3, 4].map(day_of_week => ({ day_of_week, start_time: '09:00', end_time: '21:00' })))
  })
  it('removes one hour, splitting the original window instead of losing the rest', () => {
    expect(toggleAvailabilityHour([{ day_of_week: 0, start_time: '09:00', end_time: '21:00' }], 0, 12)).toEqual([
      { day_of_week: 0, start_time: '09:00', end_time: '12:00' }, { day_of_week: 0, start_time: '13:00', end_time: '21:00' },
    ])
  })
  it('fills a partial hour and merges adjacent windows without duplicates', () => {
    const slots = [{ day_of_week: 0, start_time: '09:30', end_time: '10:00' }, { day_of_week: 0, start_time: '10:00', end_time: '11:00' }]
    expect(availabilitySegments(slots, 0, 9)).toEqual([{ start: 570, end: 600 }])
    expect(toggleAvailabilityHour(slots, 0, 9)).toEqual([{ day_of_week: 0, start_time: '09:00', end_time: '11:00' }])
  })
  it('preserves off-grid hours and other days when editing an hourly cell', () => {
    const night = { day_of_week: 6, start_time: '22:00', end_time: '23:00' }
    const slots = [night, { day_of_week: 0, start_time: '08:30', end_time: '09:30' }]
    const result = toggleAvailabilityHour(slots, 0, 9)
    expect(result).toContainEqual(night)
    expect(result).toContainEqual({ day_of_week: 0, start_time: '08:30', end_time: '10:00' })
    expect(availabilitySegments(result, 6, 20)).toEqual([])
  })
  it('leaves explicitly closed schedules empty until the teacher chooses a cell', () => {
    expect(availabilitySegments([], 0, 9)).toEqual([])
    expect(toggleAvailabilityHour(toggleAvailabilityHour([], 0, 9), 0, 9)).toEqual([])
  })
});
