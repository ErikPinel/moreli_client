import { useQuery } from '@tanstack/react-query'
import { getTeacherAvatar, getTeachers } from '../api/get-teachers'
import { teacherQueryKeys, type TeacherFilters } from '../api/teacher-query-keys'

export function useTeachers(filters: TeacherFilters, enabled = true) {
  return useQuery({
    queryKey: teacherQueryKeys.list(filters),
    queryFn: () => getTeachers(filters),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useTeacherAvatar(slug: string, hasAvatar: boolean) {
  return useQuery({
    queryKey: teacherQueryKeys.avatar(slug),
    queryFn: () => getTeacherAvatar(slug),
    enabled: hasAvatar,
    staleTime: 50 * 60_000,
    retry: false,
  })
}