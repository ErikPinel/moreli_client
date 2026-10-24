import { UserButton } from '@clerk/react'
import { Menu, UserRound, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { useAccountView } from '@/features/account/account-view'
import { AccountViewSwitch } from '@/features/account/AccountViewSwitch'
import { Logo } from './Logo'

const publicNavigation = [
  { label: 'חיפוש מורים', to: '/teachers' },
  { label: 'איך זה עובד', to: '/#how-it-works' },
  { label: 'למורים', to: '/teach' },
] as const

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsOpen(false); menuButton.current?.focus() }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])
  const navigate = useNavigate()
  const { profile, signOut, user } = useAuth()
  const { canTeach, home } = useAccountView()
  const accountPath = profile
    ? profile.role === 'admin'
      ? '/admin'
      : home
    : user
      ? '/'
      : '/login'
  const accountLabel = profile?.first_name.trim() || 'החשבון שלי'
  const navigation = canTeach
    ? publicNavigation.filter((item) => item.to !== '/teach')
    : publicNavigation

  async function handleSignOut() {
    await signOut()
    setIsOpen(false)
    navigate('/')
  }

  return (
    <header className="site-header" dir="rtl">
      <a className="skip-link" href="#main-content">דילוג לתוכן</a>
      <div className="page-shell site-header__inner">
        <Logo />

        <nav className="site-nav" aria-label="ניווט ראשי">
          {canTeach ? <Link className="nav-link" to="/teacher/dashboard">לוח הבקרה למורה</Link> : null}
          {navigation.map((item) => (
            <Link className="nav-link" key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          {!user ? (
            <>
              <Link className="site-actions__student" to="/signup">הרשמה לתלמידים</Link>
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
          {canTeach ? <AccountViewSwitch compact /> : (
            <Link className="site-actions__teach" to="/teach">
              הצטרפות כמורים
              <UserRoundPlus className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Button asChild size="icon" variant="ghost">
            <Link to={accountPath} aria-label="החשבון שלי">
              <UserRound className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            ref={menuButton}
            size="icon"
            variant="ghost"
            aria-label={isOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="ניווט למובייל">
          {canTeach ? <Link to="/teacher/dashboard" onClick={() => setIsOpen(false)}>לוח הבקרה למורה</Link> : null}
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
                הרשמה לתלמידים
              </Link>
            </>
          )}
          {canTeach ? (
            <div className="mobile-nav__views">
              <span>מצב החשבון</span>
              <AccountViewSwitch onNavigate={() => setIsOpen(false)} />
            </div>
          ) : (
            <Link className="text-primary" to="/teach" onClick={() => setIsOpen(false)}>
              הצטרפות כמורים
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  )
}