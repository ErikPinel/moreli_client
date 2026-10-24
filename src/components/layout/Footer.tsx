import { Link } from 'react-router-dom'
import { BrandName, Logo } from './Logo'
import { LifeBuoy } from 'lucide-react'
import { site } from '@/lib/site'

export function Footer() {
  return (
    <footer className="site-footer" dir="rtl">
      <div className="page-shell">
        <div className="site-footer__main"><div><Logo /><p>מצאו מורה פרטי לפי המקצוע, המיקום והתקציב שלכם.</p></div><nav aria-label="קישורים נוספים"><Link to="/teachers">חיפוש מורים</Link><Link to="/teach">הצטרפות כמורים</Link><Link to="/student/requests">בקשת התאמה</Link><Link to="/login">החשבון שלי</Link></nav></div>
        <section className="site-footer__contact" aria-label="יצירת קשר עם מורהלי">
          <p>יש שאלה, תקלה או מידע שדורש תיקון? פנו אלינו בהקדם ונוכל לבדוק ולעזור.</p>
          <address><a href={`tel:${site.internationalPhone}`}><bdi>{site.phone}</bdi></a><a href={`mailto:${site.email}`}><bdi>{site.email}</bdi></a><a href="/about.html">אודות מורהלי ויצירת קשר</a></address>
        </section>
        <div className="site-footer__bottom"><p>© {new Date().getFullYear()} <BrandName /></p><Link to="/support">תמיכה ויצירת קשר</Link><Link to="/teacher-access-terms">תנאי גישת מורים</Link><Link to="/terms">תנאי שימוש (טיוטה)</Link><Link to="/privacy">מדיניות פרטיות (טיוטה)</Link><p>שיעורים אונליין או פנים אל פנים.</p></div>
        <Link className="support-helper" to="/support" aria-label="עזרה ודיווח תקלה" title="עזרה ודיווח תקלה"><LifeBuoy aria-hidden="true" /><span>עזרה ודיווח תקלה</span></Link>
      </div>
    </footer>
  )
}