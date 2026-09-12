import { UserButton } from '@clerk/react'
import { Menu, UserRound, UserRoundPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { Logo } from './Logo'

const publicNavigation = [
  { label: 'מציאת מורים', to: '/teachers' },
  { label: 'למורים', to: '/teach' },
  { label: 'איך זה עובד', to: '/#how-it-works' },
] as const

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { profile, signOut, user } = useAuth()
  const accountPath = profile
    ? profile.role === 'teacher'
      ? '/teacher/profile'
      : profile.role === 'admin'
        ? '/admin'
        : '/student/profile'
    : user
      ? '/'
      : '/login'
  const accountLabel = profile?.first_name.trim() || 'החשבון שלי'
  const navigation = profile?.role === 'teacher'
    ? publicNavigation.map((item) => item.to === '/teach' ? { label: 'לוח המורה', to: '/teacher/dashboard' } : item)
    : publicNavigation

  async function handleSignOut() {
    await signOut()
    setIsOpen(false)
    navigate('/')
  }

  return (
    <header className="site-header" dir="rtl">
      <div className="page-shell site-header__inner">
        <Logo />

        <nav className="site-nav" aria-label="ניווט ראשי">
          {navigation.map((item) => (
            <Link className="nav-link" key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          {!user ? (
            <>
              <Link className="site-actions__student" to="/signup">הרשמה כתלמיד</Link>
              <Link className="site-actions__login" to="/login">התחברות</Link>
            </>
          ) : (
            <Link className="site-actions__login" to={accountPath}>
              <UserRound className="size-4" aria-hidden="true" />
              {accountLabel}
            </Link>
          )}
          {user ? (
            <UserButton />
          ) : null}
          <Link className="site-actions__teach" to={profile?.role === 'teacher' ? '/teacher/dashboard' : '/teach'}>
            {profile?.role === 'teacher' ? 'לוח המורה' : 'התחילו ללמד במורהלי'}
            <UserRoundPlus className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Button asChild size="icon" variant="ghost">
            <Link to={accountPath} aria-label="החשבון שלי">
              <UserRound className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={isOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <nav className="mobile-nav" aria-label="ניווט למובייל">
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setIsOpen(false)}>
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={accountPath} onClick={() => setIsOpen(false)}>
                {accountLabel}
              </Link>
              <button type="button" onClick={() => void handleSignOut()}>
                התנתקות
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsOpen(false)}>
                התחברות
              </Link>
              <Link to="/signup" onClick={() => setIsOpen(false)}>
                הרשמה כתלמיד
              </Link>
            </>
          )}
          <Link className="text-primary" to={profile?.role === 'teacher' ? '/teacher/dashboard' : '/teach'} onClick={() => setIsOpen(false)}>
            {profile?.role === 'teacher' ? 'לוח המורה' : 'התחילו ללמד במורהלי'}
          </Link>
        </nav>
      ) : null}
    </header>
  )
}