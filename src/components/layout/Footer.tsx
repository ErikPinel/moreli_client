import { Link } from 'react-router-dom'
import { BrandName, Logo } from './Logo'
import { LifeBuoy } from 'lucide-react'

export function Footer() {
  return (
    <footer className="site-footer" dir="rtl">
      <div className="page-shell">
        <div className="site-footer__main"><div><Logo /><p>מצאו מורה פרטי לפי המקצוע, המיקום והתקציב שלכם.</p></div><nav aria-label="קישורים נוספים"><Link to="/teachers">חיפוש מורים</Link><Link to="/teach">הצטרפות כמורים</Link><Link to="/student/requests">בקשת התאמה</Link><Link to="/login">החשבון שלי</Link></nav></div>
        <div className="site-footer__bottom"><p>© {new Date().getFullYear()} <BrandName /></p><Link to="/support">תמיכה ויצירת קשר</Link><Link to="/teacher-access-terms">תנאי גישת מורים</Link><p>שיעורים אונליין או פנים אל פנים.</p></div>
        <Link className="support-helper" to="/support" aria-label="עזרה ודיווח תקלה" title="עזרה ודיווח תקלה"><LifeBuoy aria-hidden="true" /><span>עזרה ודיווח תקלה</span></Link>
      </div>
    </footer>
  )
}