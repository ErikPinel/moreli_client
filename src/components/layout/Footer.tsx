import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { LifeBuoy } from 'lucide-react'

export function Footer() {
  return (
    <footer className="site-footer" dir="rtl">
      <div className="page-shell">
        <div className="site-footer__main"><div><Logo /><p>לכל אחד יש משהו ללמוד. לכל אחד יש מה ללמד.</p></div><nav aria-label="קישורים נוספים"><Link to="/teachers">מציאת מורה</Link><Link to="/teach">הצטרפות כמורה</Link><Link to="/student/requests">בקשת התאמה</Link><Link to="/login">החשבון שלי</Link></nav></div>
        <div className="site-footer__bottom"><p>© {new Date().getFullYear()} מורהלי</p><Link to="/support">תמיכה ויצירת קשר</Link><Link to="/teacher-access-terms">תנאי גישת מורים</Link><p>למידה אישית, אונליין או קרוב לבית.</p></div>
        <Link className="support-helper" to="/support" aria-label="עזרה ודיווח תקלה" title="עזרה ודיווח תקלה"><LifeBuoy aria-hidden="true" /><span>עזרה ודיווח תקלה</span></Link>
      </div>
    </footer>
  )
}