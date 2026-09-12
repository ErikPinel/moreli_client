import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import type { SignedUrlDto, TeacherSearchResultDto } from '@/types/api'
import type { TeacherFilters } from './teacher-query-keys'

export function getTeachers(filters: TeacherFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  return apiRequest<TeacherSearchResultDto>(
    `${endpoints.teachers}${params.size ? `?${params.toString()}` : ''}`,
  )
}

export function getTeacherAvatar(slug: string) {
  return apiRequest<SignedUrlDto>(endpoints.teacherAvatar(slug))
}