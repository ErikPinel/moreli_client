import type { Plugin } from 'vite'
import { businessStructuredData, publicPages, site } from '../src/lib/site.ts'

export function generatedDiscoveryFiles(): Record<string, { type: string; content: string }> {
  return {
    'about.html': {
      type: 'text/html; charset=utf-8',
      content: aboutHtml('he'),
    },
    'about-en.html': {
      type: 'text/html; charset=utf-8',
      content: aboutHtml('en'),
    },
  }
}

function aboutHtml(language: 'he' | 'en'): string {
  const english = language === 'en'
  const page = publicPages.find(page => page.path === (english ? '/about-en.html' : '/about.html'))!
  const content = english ? `
    <h1>About Morehli and contact information</h1>
    <p class="about-lead">Find a private tutor for your subject, your budget and the way you want to learn.</p>
    <p>Morehli connects students with private tutors in Israel for online and in-person lessons. Explore teaching backgrounds, compare hourly rates and send a lesson request from one place. The marketplace interface is in Hebrew, with this guide available in English.</p>
    <section aria-labelledby="subjects"><h2 id="subjects">Private lessons for academic subjects and new skills</h2>
      <p>Featured subjects include mathematics, English, programming, piano, guitar, psychometric test preparation and drawing. Use the <a href="/teachers">tutor directory</a> to explore profiles, teaching subjects, stated experience, hourly rates, lesson formats and reviews.</p>
      <p>Choose online lessons to learn remotely or select your city to look for in-person lessons. Budget filters help you focus on tutors within your preferred hourly rate.</p>
    </section>
    <section aria-labelledby="process"><h2 id="process">How Morehli works</h2>
      <ol><li>Choose a subject, city, budget and lesson format.</li><li>Compare tutor profiles and decide which background fits your learning goals.</li><li>Sign in and send a request for your preferred lesson time.</li><li>After the tutor accepts, the first lesson is created and contact details become available for further coordination.</li></ol>
      <p>You can browse tutor profiles without an account. Your account brings together lesson requests, communication and lesson management.</p>
    </section>
    <section aria-labelledby="choosing"><h2 id="choosing">What to discuss when choosing a private tutor</h2>
      <ul><li><strong>Your learning goal:</strong> identify the topic, exam or skill you want to work on and discuss any gaps in understanding.</li><li><strong>A practical learning plan:</strong> agree on suitable material and regular practice. For school subjects, connect lessons to classroom learning.</li><li><strong>Feedback and progress:</strong> ask how you will review completed work and decide what to focus on next.</li></ul>
      <p>The Education Endowment Foundation's <a href="https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition">review of research on one-to-one tuition</a> highlights targeted support, connection to classroom content and monitoring progress as important considerations when planning tuition.</p>
    </section>
    <section aria-labelledby="questions"><h2 id="questions">Frequently asked questions</h2>
      <h3>Can I find an online tutor?</h3><p>Yes. The directory supports online and in-person lessons. Choose the format that works for you and check the options in each tutor's profile.</p>
      <h3>Where can I see prices?</h3><p>Tutors' hourly rates appear on their profiles. Use the budget filters to compare relevant options.</p>
      <h3>What happens after I request a lesson?</h3><p>The tutor reviews your request. Acceptance creates the first lesson and opens contact details so you can coordinate the lesson together.</p>
      <h3>How do tutors join Morehli?</h3><p>Create an account, complete a teaching profile and submit it for review. Profiles are published after approval by the Morehli team.</p>
    </section>
    <section aria-labelledby="tutors"><h2 id="tutors">Information for tutors</h2>
      <p>The first new-student connection is included without an access fee. Further new-student connections require approved monthly access at ILS 60, paid manually through Bit. Access has no automatic charge or renewal, and is separate from lesson tuition.</p>
      <p><a href="/teacher-access-terms">Tutor access and payment terms</a> · <a href="/teach">Join as a tutor</a></p>
    </section>
    <section aria-labelledby="contact"><h2 id="contact">Contact Morehli</h2>
      <p>For questions, help choosing a tutor, website issues or corrections, please contact us promptly by phone, email or WhatsApp.</p>
      <address><a href="tel:${site.internationalPhone}">Phone: <bdi>${site.internationalPhone}</bdi> (${site.phone} in Israel)</a><a href="mailto:${site.email}">Email: ${site.email}</a><a href="${site.whatsappUrl}">WhatsApp</a></address>
      <p>You can also <a href="/support">contact support</a> and sign in to manage a personal support conversation.</p>
    </section>
  ` : `
    <h1>אודות מורהלי ויצירת קשר</h1>
    <p class="about-lead">מורה פרטי למקצוע שלכם, לתקציב שלכם ולאופן שבו תרצו ללמוד.</p>
    <p>מורהלי מחברת בין תלמידים למורים פרטיים בישראל לשיעורים אונליין ופנים אל פנים. אפשר להכיר את הרקע של המורים, להשוות מחירים לשעה ולשלוח בקשה לשיעור במקום אחד.</p>
    <section aria-labelledby="subjects"><h2 id="subjects">שיעורים פרטיים למקצועות הלימוד ולמיומנויות חדשות</h2>
      <p>תחומי הלימוד המוצגים באתר כוללים מתמטיקה, אנגלית, תכנות, פסנתר, גיטרה, פסיכומטרי וציור. ב<a href="/teachers">מדריך המורים</a> אפשר לעיין בפרופילים ולבדוק תחומי הוראה, ניסיון מוצג, מחירים לשעה, אפשרויות לימוד וביקורות.</p>
      <p>בחרו שיעורים אונליין ללמידה מרחוק, או עיר לחיפוש שיעורים פנים אל פנים. סינון לפי תקציב מאפשר להתמקד במורים בטווח המחיר שמתאים לכם.</p>
    </section>
    <section aria-labelledby="process"><h2 id="process">איך מורהלי עובדת?</h2>
      <ol><li>בוחרים מקצוע, עיר, תקציב ואופן לימוד.</li><li>משווים בין פרופילי המורים ובודקים איזה רקע מתאים למטרות הלמידה שלכם.</li><li>נכנסים לחשבון ושולחים בקשה לשיעור במועד המבוקש.</li><li>לאחר אישור המורה נוצר השיעור הראשון ונפתחים פרטי הקשר להמשך התיאום.</li></ol>
      <p>אפשר לעיין בפרופילי המורים ללא חשבון. החשבון מרכז את הבקשות, הקשר וניהול השיעורים.</p>
    </section>
    <section aria-labelledby="choosing"><h2 id="choosing">מה כדאי לבדוק כשבוחרים מורה פרטי?</h2>
      <ul><li><strong>מטרת הלמידה:</strong> הגדירו את הנושא, המבחן או המיומנות שתרצו לקדם ושוחחו עם המורה על הנקודות שדורשות חיזוק.</li><li><strong>תוכנית שמתאימה לכם:</strong> תאמו חומרי לימוד ותרגול סדיר. במקצועות בית הספר כדאי לחבר את השיעורים לחומר הנלמד בכיתה.</li><li><strong>משוב ומעקב התקדמות:</strong> בדקו איך תעברו יחד על העבודה שבוצעה ואיך תבחרו את הנושאים להמשך.</li></ul>
      <p><a href="https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition">סקירת המחקר של Education Endowment Foundation על שיעורים אישיים</a> מדגישה תמיכה ממוקדת, קשר לחומר בכיתה ומעקב התקדמות כשיקולים חשובים בתכנון הלמידה.</p>
    </section>
    <section aria-labelledby="questions"><h2 id="questions">שאלות נפוצות</h2>
      <h3>האם אפשר למצוא מורה לאונליין?</h3><p>כן. במדריך אפשר לחפש שיעורים אונליין ופנים אל פנים. בחרו את אופן הלימוד שנוח לכם ובדקו את האפשרויות בפרופיל המורה.</p>
      <h3>איפה רואים מחירים?</h3><p>המחיר לשעה מוצג בפרופיל של כל מורה. אפשר לסנן לפי תקציב ולהשוות בין האפשרויות הרלוונטיות.</p>
      <h3>מה קורה אחרי שליחת בקשה לשיעור?</h3><p>המורה בודק את הבקשה. לאחר האישור נוצר השיעור הראשון ונפתחים פרטי הקשר כדי שתוכלו לתאם יחד את פרטי הלימוד.</p>
      <h3>איך מצטרפים כמורים למורהלי?</h3><p>פותחים חשבון, ממלאים פרופיל הוראה ושולחים אותו לבדיקה. הפרופילים מתפרסמים לאחר אישור צוות מורהלי.</p>
    </section>
    <section aria-labelledby="tutors"><h2 id="tutors">מידע למורים</h2>
      <p>הקשר עם התלמיד החדש הראשון ניתן ללא עלות גישה. קבלת פרטי קשר של תלמידים חדשים נוספים דורשת גישה חודשית מאושרת במחיר 60 ש״ח, בתשלום ידני ב־Bit. אין חיוב או חידוש אוטומטי, ותשלום הגישה נפרד מהתשלום עבור השיעורים.</p>
      <p><a href="/teacher-access-terms">לתנאי גישת מורים והתשלום</a> · <a href="/teach">להצטרפות כמורים</a></p>
    </section>
    <section aria-labelledby="contact"><h2 id="contact">יצירת קשר עם מורהלי</h2>
      <p>לשאלות, לעזרה בבחירת מורה, לתקלה באתר או לתיקון מידע, פנו אלינו בהקדם בטלפון, בדוא״ל או בוואטסאפ.</p>
      <address><a href="tel:${site.internationalPhone}">טלפון: <bdi>${site.phone}</bdi></a><a href="mailto:${site.email}">דוא״ל: <bdi>${site.email}</bdi></a><a href="${site.whatsappUrl}">שיחה בוואטסאפ</a></address>
      <p>אפשר גם <a href="/support">לפנות לתמיכה</a> ולהיכנס לחשבון לניהול ומעקב אחר פנייה אישית.</p>
    </section>
  `
  return `<!doctype html>
<html lang="${language}" dir="${english ? 'ltr' : 'rtl'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <link rel="canonical" href="${site.url}${page.path}">
  <link rel="alternate" hreflang="he-IL" href="${site.url}/about.html">
  <link rel="alternate" hreflang="en" href="${site.url}/about-en.html">
  <link rel="alternate" hreflang="x-default" href="${site.url}/about.html">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="${site.url}${page.path}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify(businessStructuredData)}</script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #0c244f; background: #f6f8fc; font-family: Arial, sans-serif; line-height: 1.8; overflow-wrap: anywhere; }
    header, main, footer { max-width: 900px; margin: auto; padding: 24px; }
    main { background: white; border: 1px solid #dce3ef; border-radius: 16px; }
    nav, address { display: flex; gap: 12px 24px; flex-wrap: wrap; font-style: normal; }
    a { color: #123d80; text-underline-offset: 4px; }
    a:focus-visible { outline: 3px solid #123d80; outline-offset: 4px; }
    nav a, address a { padding-block: 10px; }
    h1 { line-height: 1.4; }
    h2, h3 { line-height: 1.5; }
    section + section { margin-block-start: 32px; }
    .about-lead { font-size: 1.125rem; }
  </style>
</head>
<body>
  <header><a href="${site.url}/">${english ? 'Morehli' : site.name}</a><nav aria-label="${english ? 'Main navigation' : 'ניווט ראשי'}"><a href="/teachers">${english ? 'Find a tutor' : 'חיפוש מורים'}</a><a href="/teach">${english ? 'Join as a tutor' : 'הצטרפות כמורים'}</a><a href="/support">${english ? 'Support' : 'תמיכה'}</a>${english ? '<a href="/about.html" lang="he" hreflang="he-IL">עברית</a>' : '<a href="/about-en.html" lang="en" hreflang="en">English</a>'}</nav></header>
  <main id="main-content">${content}</main>
  <footer><p>${english ? 'Morehli' : site.name} · <a href="${site.url}/">${site.url}/</a> · <a href="/support">${english ? 'Help and contact' : 'עזרה ויצירת קשר'}</a></p></footer>
</body>
</html>
`
}

export function publicDiscovery(): Plugin {
  const files = generatedDiscoveryFiles()
  return {
    name: 'public-discovery',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: `${site.url}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:title', content: publicPages[0].title }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:description', content: publicPages[0].description }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: `${site.url}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:locale', content: 'he_IL' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:site_name', content: site.name }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(businessStructuredData), injectTo: 'head' },
      ]
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const filename = pathname.slice(1)
        const file = Object.hasOwn(files, filename) ? files[filename] : undefined
        if (file) {
          response.setHeader('Content-Type', file.type)
          response.end(file.content)
        } else if (pathname === '/ai-catalog.json') {
          response.statusCode = 404
          response.end('Not found')
        } else {
          next()
        }
      })
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(generatedDiscoveryFiles())) {
        this.emitFile({ type: 'asset', fileName, source: file.content })
      }
    },
  }
}
