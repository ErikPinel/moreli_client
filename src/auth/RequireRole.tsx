import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types/api'
import { useAuth } from './useAuth'

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <Navigate replace to="/" />
  return <Outlet />
}