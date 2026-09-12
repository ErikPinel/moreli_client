export const professions = Object.freeze([
  {
    slug: 'mathematics',
    nameHe: 'מתמטיקה',
    nameEn: 'Mathematics',
    parentSlug: null,
    sortOrder: 10,
  },
  {
    slug: 'english',
    nameHe: 'אנגלית',
    nameEn: 'English',
    parentSlug: null,
    sortOrder: 20,
  },
  {
    slug: 'hebrew',
    nameHe: 'עברית',
    nameEn: 'Hebrew',
    parentSlug: null,
    sortOrder: 30,
  },
  {
    slug: 'physics',
    nameHe: 'פיזיקה',
    nameEn: 'Physics',
    parentSlug: null,
    sortOrder: 40,
  },
  {
    slug: 'chemistry',
    nameHe: 'כימיה',
    nameEn: 'Chemistry',
    parentSlug: null,
    sortOrder: 50,
  },
  {
    slug: 'biology',
    nameHe: 'ביולוגיה',
    nameEn: 'Biology',
    parentSlug: null,
    sortOrder: 60,
  },
  {
    slug: 'computer-science',
    nameHe: 'מדעי המחשב',
    nameEn: 'Computer science',
    parentSlug: null,
    sortOrder: 70,
  },
  {
    slug: 'mathematics-elementary',
    nameHe: 'יסודי',
    nameEn: 'Elementary mathematics',
    parentSlug: 'mathematics',
    sortOrder: 10,
  },
  {
    slug: 'mathematics-middle-school',
    nameHe: 'חטיבה',
    nameEn: 'Middle-school mathematics',
    parentSlug: 'mathematics',
    sortOrder: 20,
  },
  {
    slug: 'mathematics-bagrut',
    nameHe: 'בגרות',
    nameEn: 'Bagrut mathematics',
    parentSlug: 'mathematics',
    sortOrder: 30,
  },
  {
    slug: 'mathematics-bagrut-3',
    nameHe: '3 יחידות',
    nameEn: '3 units',
    parentSlug: 'mathematics-bagrut',
    sortOrder: 10,
  },
  {
    slug: 'mathematics-bagrut-4',
    nameHe: '4 יחידות',
    nameEn: '4 units',
    parentSlug: 'mathematics-bagrut',
    sortOrder: 20,
  },
  {
    slug: 'mathematics-bagrut-5',
    nameHe: '5 יחידות',
    nameEn: '5 units',
    parentSlug: 'mathematics-bagrut',
    sortOrder: 30,
  },
])

export const topLevelProfessions = Object.freeze(
  professions.filter((profession) => profession.parentSlug === null),
)

export default professions
