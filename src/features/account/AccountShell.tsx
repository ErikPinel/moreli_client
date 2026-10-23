import {
  Bell,
  CalendarDays,
  CreditCard,
  ClipboardList,
  Heart,
  LifeBuoy,
  LayoutDashboard,
  MessageCircle,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/auth/useAuth'
import { useTeacherProfile } from './useAccountData'
import { useUnreadNotifications } from './useAccountData'
import type { InquiryDto } from '@/types/api'

type AccountShellProps = PropsWithChildren<{
  title: string
  description: string
  actions?: ReactNode
}>

const studentLinks = [
  { to: '/student/profile', label: 'הפרופיל שלי', icon: UserRound },
  { to: '/student/requests', label: 'בקשות והתאמות', icon: ClipboardList },
  { to: '/student/favorites', label: 'מורים שמורים', icon: Heart },
  { to: '/student/inquiries', label: 'הפניות שלי', icon: MessageCircle },
  { to: '/student/reviews', label: 'הביקורות שלי', icon: Star },
] as const

const teacherLinks = [
  { to: '/teacher/dashboard', label: 'לוח הבקרה', icon: LayoutDashboard },
  { to: '/teacher/onboarding', label: 'השלמת הפרופיל', icon: ClipboardList },
  { to: '/teacher/inquiries', label: 'פניות מתלמידים', icon: MessageCircle },
  { to: '/teacher/students', label: 'התלמידים שלי', icon: UsersRound },
  { to: '/teacher/reviews', label: 'ביקורות ותגובות', icon: Star },
  { to: '/teacher/access', label: 'גישה ותשלום', icon: CreditCard },
  { to: '/teacher/schedule', label: 'זמינות שבועית', icon: CalendarDays },
] as const

export function AccountShell({ title, description, actions, children }: AccountShellProps) {
  const { profile } = useAuth()
  const unreadQuery = useUnreadNotifications()
  const role = profile?.role === 'teacher' ? 'teacher' : 'student'
  const teacherQuery = useTeacherProfile(role === 'teacher')
  const links = role === 'teacher'
    ? teacherLinks.map((link) => link.to === '/teacher/onboarding'
      ? { ...link, label: teacherQuery.data?.profile_status === 'draft' ? 'השלמת הפרופיל' : 'פרטי ההוראה' }
      : link)
    : studentLinks

  return (
    <div className="workspace-page" dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1} className="page-shell workspace-layout">
        <aside className="workspace-sidebar">
          <div className="workspace-sidebar__identity">
            <span>{profile?.first_name.trim().charAt(0) || 'מ'}</span>
            <div>
              <strong>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'החשבון שלי'}</strong>
              <small>{role === 'teacher' ? 'חשבון מורה' : 'חשבון תלמיד'}</small>
            </div>
          </div>
          <nav aria-label="אזור אישי">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : undefined}>
                <Icon aria-hidden="true" />{label}
              </NavLink>
            ))}
            <NavLink to={`/${role}/notifications`} className={({ isActive }) => isActive ? 'is-active' : undefined}>
              <Bell aria-hidden="true" />התראות
              {unreadQuery.data?.count ? <span className="workspace-nav-count">{unreadQuery.data.count}</span> : null}
            </NavLink>
            <NavLink to="/support" className={({ isActive }) => isActive ? 'is-active' : undefined}><LifeBuoy aria-hidden="true" />עזרה ותמיכה</NavLink>
          </nav>
        </aside>

        <section className="workspace-main">
          <header className="workspace-heading">
            <div><p>{role === 'teacher' ? 'מרחב המורה' : 'האזור האישי'}</p><h1>{title}</h1><span>{description}</span></div>
            {actions ? <div className="workspace-heading__actions">{actions}</div> : null}
          </header>
          {children}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export function WorkspaceState({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'error' }>) {
  return <div className={`workspace-state workspace-state--${tone}`}>{children}</div>
}

export function InquiryStatusFilter({ value, onChange }: { value: InquiryDto['status'] | ''; onChange: (value: InquiryDto['status'] | '') => void }) {
  return <label className="inquiry-filter"><span>מצב הפנייה</span><select value={value} onChange={(event) => onChange(event.target.value as InquiryDto['status'] | '')}>
    <option value="">כל הפניות</option><option value="sent">ממתינות למענה</option><option value="viewed">נקראו, טרם נענו</option><option value="accepted">התקבלו</option><option value="declined">נדחו</option><option value="expired">פג תוקפן</option>
  </select></label>
}