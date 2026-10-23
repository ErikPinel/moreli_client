import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  GraduationCap,
  KeyRound,
  LogIn,
  PencilLine,
  Presentation,
  ShieldCheck,
  UserRoundPlus,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { ScribbleArrow, ScribbleUnderline } from '@/features/home/components/Scribbles'
import teacherPortrait from '@/features/home/static assets/inviteJoinTeacherMainPage.jpg'

const steps = [
  { title: 'זהות ופרטי קשר', text: 'שם, תמונה וטלפון. הטלפון נחשף לתלמיד רק אחרי שאישרתם את הפנייה שלו.' },
  { title: 'הצגה מקצועית', text: 'כמה משפטים עליכם, ניסיון ומחיר לשעה. זה מה שתלמידים קוראים לפני שהם פונים.' },
  { title: 'מקצועות הוראה', text: 'בוחרים מקצועות מהרשימה, ומסמנים אם מלמדים אונליין, פרונטלית או בשתי הדרכים.' },
  { title: 'זמינות שבועית', text: 'שעות קבועות בשבוע. תלמידים יבקשו שיעור רק בזמנים שסימנתם.' },
] as const

const facts = [
  { icon: ShieldCheck, title: 'הפרופיל מתפרסם אחרי בדיקה', text: 'מנהל עובר על כל פרופיל חדש לפני שהוא מופיע בחיפוש. עד אז אפשר לערוך אותו בחופשיות.' },
  { icon: Wallet, title: 'התלמיד החדש הראשון בלי עלות', text: 'אחריו, גישה חודשית של 60 ש״ח לקבלת תלמידים חדשים. אין חיוב או חידוש אוטומטי.', link: { to: '/teacher-access-terms', label: 'תנאי הגישה המלאים' } },
  { icon: KeyRound, title: 'פרטי קשר רק אחרי אישור', text: 'אתם מחליטים אילו פניות לקבל. פרטי הקשר נחשפים לשני הצדדים רק אחרי שאישרתם.' },
] as const

function IntroActions() {
  const { user, profile, isLoading } = useAuth()

  if (profile?.role === 'teacher') {
    return (
      <div className="teach-intro__actions">
        <Button asChild size="lg"><Link to="/teacher/dashboard"><Presentation />מעבר למצב מורה</Link></Button>
        <Link className="teach-intro__secondary" to="/teacher/onboarding"><PencilLine aria-hidden="true" />עריכת פרופיל המורה</Link>
      </div>
    )
  }

  if (profile?.role === 'admin') {
    return <p className="teach-intro__note">חשבון מנהל לא יכול להוסיף פרופיל מורה. כדי ללמד, יש להתחבר עם חשבון אישי.</p>
  }

  if (user || isLoading) {
    return (
      <div className="teach-intro__actions">
        <Button asChild size="lg"><Link to="/teach/start"><UserRoundPlus />התחלת פרופיל מורה</Link></Button>
        {profile ? <Link className="teach-intro__secondary" to="/student"><GraduationCap aria-hidden="true" />חזרה לחשבון התלמיד</Link> : null}
      </div>
    )
  }

  return (
    <div className="teach-intro__actions">
      <Button asChild size="lg"><Link to="/signup?redirect=%2Fteach%2Fstart"><UserRoundPlus />הרשמה ופתיחת פרופיל מורה</Link></Button>
      <Link className="teach-intro__secondary" to="/login?redirect=%2Fteach%2Fstart"><LogIn aria-hidden="true" />כבר רשומים? התחברות</Link>
    </div>
  )
}

function ModeSwitchIllustration() {
  return (
    <div className="teach-intro__visual" aria-hidden="true">
      <img src={teacherPortrait} alt="" />
      <div className="teach-intro__account">
        <div className="teach-intro__account-head">
          <span>ד</span>
          <div><strong>דניאל כהן</strong><small>חשבון אחד</small></div>
        </div>
        <div className="teach-intro__switch">
          <span><GraduationCap />תלמיד</span>
          <span className="is-active"><Presentation />מורה</span>
        </div>
        <ul>
          <li><CalendarDays />2 פניות חדשות ממתינות לך</li>
          <li><BadgeCheck />הפרופיל אושר ומופיע בחיפוש</li>
        </ul>
      </div>
      <p className="teach-intro__visual-note">
        עוברים בין המצבים בלחיצה
        <ScribbleArrow className="teach-intro__visual-arrow" />
      </p>
    </div>
  )
}

export function TeachIntroPage() {
  return (
    <div dir="rtl" className="teach-intro-page">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section className="teach-intro" aria-labelledby="teach-intro-title">
          <div className="page-shell teach-intro__hero">
            <div className="teach-intro__copy">
              <h1 id="teach-intro-title">
                מלמדים במורהלי <span className="teach-intro__accent">מאותו החשבון<ScribbleUnderline className="teach-intro__underline" /></span>
              </h1>
              <p>
                כל חשבון במורהלי מתחיל כחשבון תלמיד. כשמוסיפים פרופיל מורה, שום דבר לא נמחק: ממשיכים ללמוד, לשמור מורים ולבקש שיעורים, ועוברים למצב מורה כדי לענות לפניות ולנהל תלמידים.
              </p>
              <IntroActions />
            </div>
            <ModeSwitchIllustration />
          </div>
        </section>

        <section className="page-shell teach-intro__modes" aria-labelledby="teach-modes-title">
          <h2 id="teach-modes-title">שני מצבים, חשבון אחד</h2>
          <div className="teach-intro__mode-grid">
            <article className="teach-intro__mode teach-intro__mode--student">
              <GraduationCap aria-hidden="true" />
              <h3>מצב תלמיד</h3>
              <p>הבקשות, המורים השמורים והפניות שלכם כתלמידים. זמין לכל חשבון, תמיד.</p>
            </article>
            <article className="teach-intro__mode teach-intro__mode--teacher">
              <Presentation aria-hidden="true" />
              <h3>מצב מורה</h3>
              <p>פניות מתלמידים, התלמידים שלכם, זמינות ופרופיל ציבורי. נפתח אחרי הוספת פרופיל מורה.</p>
            </article>
          </div>
        </section>

        <section className="page-shell teach-intro__steps" aria-labelledby="teach-steps-title">
          <h2 id="teach-steps-title">מה ממלאים בפרופיל המורה</h2>
          <p>ארבעה חלקים קצרים. הטיוטה נשמרת בלשונית, כך שאפשר לעצור ולחזור.</p>
          <ol>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="teach-intro__step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="page-shell teach-intro__facts" aria-labelledby="teach-facts-title">
          <h2 id="teach-facts-title">מה חשוב לדעת לפני שמתחילים</h2>
          <ul>
            {facts.map(({ icon: Icon, title, text, ...rest }) => (
              <li key={title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {'link' in rest ? <Link to={rest.link.to}>{rest.link.label}<ArrowLeft aria-hidden="true" /></Link> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="teach-intro__closing">
          <div className="page-shell">
            <h2>מוכנים להתחיל?</h2>
            <IntroActions />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
