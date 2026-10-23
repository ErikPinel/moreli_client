import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import type { LessonCalendarDto, SupportContactDto, TeacherAccessDto } from '@/types/api'

export const accessKey = ['account', 'teacher-access'] as const
export function useTeacherAccess() {
  const { profile } = useAuth()
  return useQuery({ queryKey: accessKey, queryFn: () => apiRequest<TeacherAccessDto>(endpoints.teacherAccess), enabled: profile?.role === 'teacher', staleTime: 15000 })
}
export function useSupportContact() {
  return useQuery({ queryKey: ['public', 'support-contact'], queryFn: () => apiRequest<SupportContactDto>(endpoints.supportContact), staleTime: 300000 })
}
export function useTeacherCalendar(slug: string, duration: number) {
  return useQuery({ queryKey: ['teachers', 'calendar', slug, duration], queryFn: () => apiRequest<LessonCalendarDto>(`${endpoints.teacherCalendar(slug)}?duration=${duration}&days=60`), enabled: Boolean(slug), staleTime: 10000 })
}