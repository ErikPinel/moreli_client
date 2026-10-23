import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 15_000)
    return () => window.clearTimeout(timer)
  }, [])
  if (timedOut) return <main id="main-content" tabIndex={-1} dir="rtl" className="page-shell py-12 space-y-4" role="alert"><h1>לא הצלחנו לחבר את החשבון</h1><p>טעינת שירות הכניסה מתעכבת. הפרטים שלכם לא השתנו. בדקו את החיבור ונסו שוב.</p><Button onClick={() => window.location.reload()}><RefreshCw />ניסיון נוסף</Button><div className="flex flex-wrap gap-4"><Link to="/">חזרה לדף הבית</Link><Link to="/support">פנייה לתמיכה</Link></div></main>
  return (
    <div className="grid min-h-screen place-items-center" role="status">
      <Spinner className="size-7 text-primary" />
      <span className="sr-only">טוען...</span>
    </div>
  )
}