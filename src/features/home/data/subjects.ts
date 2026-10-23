import { catalogs } from '@/data/catalogs'

export function subjectHref(catalogName: string) {
  const slug = catalogs.professions.find((item) => item.name_he === catalogName)?.slug
  return slug ? `/teachers?subject=${encodeURIComponent(slug)}` : '/teachers'
}

export type FeaturedSubject = {
  key: string
  label: string
  note: string
  catalogName: string
}

export const featuredSubjects: FeaturedSubject[] = [
  { key: 'math', label: 'מתמטיקה', note: 'מיסודי ועד 5 יחידות', catalogName: 'מתמטיקה - הכל' },
  { key: 'english', label: 'אנגלית', note: 'שיחה, בגרות ואקדמיה', catalogName: 'אנגלית - הכל' },
  { key: 'coding', label: 'תכנות', note: 'מהשורה הראשונה', catalogName: 'מדעי המחשב תכנות - הכל' },
  { key: 'piano', label: 'פסנתר', note: 'לילדים ולמבוגרים', catalogName: 'מוסיקה - פסנתר' },
  { key: 'guitar', label: 'גיטרה', note: 'אקורד אחרי אקורד', catalogName: 'מוסיקה - גיטרה' },
  { key: 'psychometric', label: 'פסיכומטרי', note: 'הכנה בקצב שלכם', catalogName: 'פסיכומטרי - הכל' },
  { key: 'drawing', label: 'ציור', note: 'רישום, צבע ויצירה', catalogName: 'ציור - הכל' },
]

export const popularSearches = [
  { label: 'מתמטיקה', catalogName: 'מתמטיקה - הכל' },
  { label: 'אנגלית', catalogName: 'אנגלית - הכל' },
  { label: 'פסיכומטרי', catalogName: 'פסיכומטרי - הכל' },
  { label: 'לשון', catalogName: 'לשון - הכל' },
  { label: 'כימיה', catalogName: 'כימיה - הכל' },
  { label: 'פסנתר', catalogName: 'מוסיקה - פסנתר' },
] as const
