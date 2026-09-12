import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) return <RouteLoader />
  if (!auth.user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate replace to={`/login?redirect=${redirect}`} />
  }

  return <Outlet />
}

function RouteLoader() {
  return (
    <div className="grid min-h-screen place-items-center" role="status">
      <Spinner className="size-7 text-primary" />
      <span className="sr-only">טוען...</span>
    </div>
  )
}