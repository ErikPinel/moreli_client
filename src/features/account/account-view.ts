import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import type { UserRole } from '@/types/api'
import { useTeacherProfile } from './useAccountData'

export type AccountView = 'student' | 'teacher'

export const accountViewHome: Record<AccountView, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
}

// Every account can learn; a teacher profile is added on top of the student account.
export function canLearn(role?: UserRole | null) {
  return role === 'student' || role === 'teacher'
}

export function viewFromPath(pathname: string): AccountView | null {
  if (pathname === '/student' || pathname.startsWith('/student/')) return 'student'
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) return 'teacher'
  return null
}

const storageKey = (userId: string) => `moreli:account-view:${userId}`

export function useCanSaveTeacher(teacherSlug: string) {
  const { profile } = useAuth()
  const ownTeacher = useTeacherProfile(profile?.role === 'teacher')
  return canLearn(profile?.role) && ownTeacher.data?.slug !== teacherSlug
}

function readStoredView(userId: string): AccountView | null {
  try {
    const value = localStorage.getItem(storageKey(userId))
    return value === 'student' || value === 'teacher' ? value : null
  } catch {
    return null
  }
}

export function resolveAccountView(role: UserRole | null | undefined, pathname: string, storedView: AccountView | null): AccountView {
  if (role !== 'teacher') return 'student'
  return viewFromPath(pathname) ?? storedView ?? 'student'
}

export function useAccountView() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const canTeach = profile?.role === 'teacher'
  const pathView = viewFromPath(pathname)
  const view = resolveAccountView(profile?.role, pathname, canTeach && profile ? readStoredView(profile.id) : null)

  useEffect(() => {
    if (!canTeach || !pathView || !profile) return
    try { localStorage.setItem(storageKey(profile.id), pathView) } catch { /* Storage is optional. */ }
  }, [canTeach, pathView, profile])

  return { view, canTeach, home: accountViewHome[view] }
}
