import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import type { LessonDto, PaginatedDto } from '@/types/api'
import { accountKeys } from './useAccountData'

export type LessonSide = 'student' | 'teacher'
export type LessonView = 'upcoming' | 'week' | 'past' | 'needs_action' | 'completed' | 'all'
export const lessonZone = 'Asia/Jerusalem'
export function useLessonClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
export const lessonLabels: Record<LessonDto['status'], string> = {
  needs_scheduling: 'צריך לקבוע מועד',
  scheduled: 'נקבע',
  completed: 'התקיים · אושר על ידי שניכם',
  cancelled: 'בוטל',
  no_show_reported: 'דווחה אי-הגעה',
}
export function lessonName(lesson: LessonDto, side: LessonSide) {
  const person = side === 'teacher' ? lesson.student : lesson.teacher.profile
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || (side === 'teacher' ? 'התלמיד/ה' : 'המורה')
}
export function lessonTime(value: string) {
  return DateTime.fromISO(value).setZone(lessonZone).setLocale('he').toFormat('cccc, dd בLLL · HH:mm')
}
export function useLessons(side: LessonSide, view: LessonView = 'upcoming', options: { limit?: number; page?: number; studentId?: string; from?: string; to?: string } = {}, enabled = true) {
  const params = new URLSearchParams({ side, view, limit: String(options.limit ?? 20), page: String(options.page ?? 1) })
  if (options.studentId) params.set('studentId', options.studentId)
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  return useQuery({
    queryKey: ['lessons', side, view, options],
    enabled,
    queryFn: () => apiRequest<PaginatedDto<LessonDto> & { total: number }>(`${endpoints.lessons}?${params}`),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
export function useRefreshLessons() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['lessons'] })
    void client.invalidateQueries({ queryKey: ['account', 'inquiries'] })
    void client.invalidateQueries({ queryKey: ['teachers', 'calendar'] })
    void client.invalidateQueries({ queryKey: accountKeys.notifications })
  }
}
