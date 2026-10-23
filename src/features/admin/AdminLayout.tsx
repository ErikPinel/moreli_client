import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, ClipboardCheck, CreditCard, History, LayoutDashboard, LifeBuoy, LogOut, Mail, MessageSquare, RefreshCw, ShieldCheck, Star } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'

const destinations = [
  { path: '/admin', title: 'סקירה כללית', icon: LayoutDashboard },
  { path: '/admin/payments', title: 'תשלומים וגישה', icon: CreditCard },
  { path: '/admin/history', title: 'היסטוריית החלטות', icon: History },
  { path: '/admin/onboarding', title: 'הצטרפות מורים', icon: ClipboardCheck },
  { path: '/admin/reviews', title: 'ביקורות ותגובות', icon: Star },
  { path: '/admin/support', title: 'תמיכה ודיווחים', icon: LifeBuoy },
  { path: '/admin/emails', title: 'מסירת אימיילים', icon: Mail },
  { path: '/admin/activity', title: 'בירור פנייה ושיעור', icon: MessageSquare },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const client = useQueryClient()
  const location = useLocation()
  const current = destinations.find(item => item.path === location.pathname) ?? destinations[0]

  return <div className="admin-workspace" dir="rtl">
    <a className="skip-link" href="#main-content">דילוג לתוכן</a>
    <header className="admin-topbar">
      <Logo />
      <span className="admin-topbar__label"><ShieldCheck aria-hidden="true" />ניהול מורהלי</span>
      <div className="admin-topbar__actions">
        <NavLink to="/" className="admin-site-link"><ArrowUpRight aria-hidden="true" />לאתר</NavLink>
        <Button variant="ghost" size="icon" title="התנתקות" aria-label="התנתקות" onClick={() => void signOut()}><LogOut /></Button>
      </div>
    </header>
    <div className="admin-workspace__layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__identity"><ShieldCheck aria-hidden="true" /><div><strong>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'מנהל האתר'}</strong><span dir="ltr">{profile?.contact_email}</span></div></div>
        <nav aria-label="ניווט ניהול">
          {destinations.map(({ path, title, icon: Icon }) => <NavLink key={path} to={path} end={path === '/admin'} className={({ isActive }) => isActive ? 'is-active' : undefined}><Icon aria-hidden="true" /><span>{title}</span></NavLink>)}
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="admin-main">
        <header className="admin-page-heading"><div><p>מרחב הניהול</p><h1>{current.title}</h1></div><Button variant="outline" onClick={() => void client.invalidateQueries({ queryKey: ['admin'] })}><RefreshCw aria-hidden="true" />רענון</Button></header>
        <Outlet />
        <footer className="admin-workspace__footer">מורהלי · כל הזמנים לפי שעון ישראל</footer>
      </main>
    </div>
  </div>
}