import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="border-t bg-white py-8" dir="rtl">
      <div className="page-shell flex flex-col items-center justify-between gap-5 text-sm text-muted-foreground sm:flex-row">
        <Logo className="text-xl" />
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="קישורים נוספים">
          <Link className="hover:text-primary" to="/teachers">מציאת מורה</Link>
          <Link className="hover:text-primary" to="/teach">למורים</Link>
          <Link className="hover:text-primary" to="/login">כניסה</Link>
        </nav>
        <p>© 2026 מורהלי</p>
      </div>
    </footer>
  )
}