export const site = {
  name: 'מורהלי',
  url: 'https://morehli.co.il',
  email: 'morehlisrael@gmail.com',
  phone: '0503939008',
  internationalPhone: '+972503939008',
  whatsappUrl: `https://wa.me/972503939008?text=${encodeURIComponent('שלום, הגעתי דרך מורהלי ואשמח לקבל עזרה.')}`,
} as const

export const publicPages = [
  { path: '/', title: 'מורהלי | מורה פרטי שמתאים לכם', description: 'מחפשים מורה פרטי? במורהלי תמצאו מורים לפי מקצוע, מיקום ותקציב — לשיעורים אונליין או פנים אל פנים. הכירו את המורים ושלחו בקשה לשיעור.' },
  { path: '/teachers', title: 'חיפוש מורים פרטיים | מורהלי', description: 'חפשו מורים פרטיים לפי מקצוע, עיר, תקציב ואופן הלימוד. הכירו את פרופילי המורים ושלחו בקשה לשיעור לאחר כניסה לחשבון.' },
  { path: '/teach', title: 'הצטרפות כמורים | מורהלי', description: 'מידע על הצטרפות כמורים למורהלי, פרסום פרופיל לאחר אישור מנהל וקבלת פניות מתלמידים. תנאי הגישה והתשלום מפורסמים באתר.' },
  { path: '/support', title: 'עזרה ויצירת קשר | מורהלי', description: 'יש שאלה או תקלה במורהלי? פנו אלינו בטלפון 0503939008, בדוא״ל morehlisrael@gmail.com או בוואטסאפ. פרטי הקשר זמינים ללא חשבון.' },
  { path: '/teacher-access-terms', title: 'גישת מורים ותשלום | מורהלי', description: 'תנאי גישת מורים למורהלי: תלמיד חדש ראשון ללא עלות, ולאחר מכן גישה חודשית מאושרת בתשלום ידני. ללא חיוב או חידוש אוטומטי.' },
  { path: '/about.html', title: 'אודות מורהלי | מורים פרטיים ושיעורים אונליין בישראל', description: 'הכירו את מורהלי: חיפוש מורים פרטיים לפי מקצוע, עיר ותקציב, לשיעורים אונליין או פנים אל פנים. מידע על בחירת מורה, הצטרפות ויצירת קשר.' },
  { path: '/about-en.html', title: 'About Morehli | Private Tutors & Online Lessons in Israel', description: 'Find private tutors in Israel by subject, city, budget and lesson format. Learn how Morehli works, compare tutor profiles and contact our support team.' },
] as const

export const businessStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: site.name,
      alternateName: 'Morehli',
      url: `${site.url}/`,
      email: site.email,
      telephone: site.internationalPhone,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: site.internationalPhone,
        email: site.email,
        url: `${site.url}/support`,
        availableLanguage: 'he',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      name: site.name,
      url: `${site.url}/`,
      inLanguage: ['he-IL', 'en'],
      publisher: { '@id': `${site.url}/#organization` },
    },
  ],
}
