import { useSearchParams } from 'react-router-dom'
import type { TeacherFilters } from '@/features/teachers/api/teacher-query-keys'
import { useCities, useLevels, useSubjects } from './useTaxonomies'

export type TeacherSort = NonNullable<TeacherFilters['sort']>

export type TeacherSearchValues = {
  subject: string
  level: string
  city: string
  online: boolean
  inPerson: boolean
  priceMin: string
  priceMax: string
  verifiedOnly: boolean
  ratingMin: string
  sort: TeacherSort
  page: number
}

const validSorts = new Set<TeacherSort>([
  'recommended',
  'rating',
  'price_asc',
  'price_desc',
])

export function useTeacherSearchParams() {
  const [params, setParams] = useSearchParams()
  const subjectsQuery = useSubjects()
  const levelsQuery = useLevels()
  const citiesQuery = useCities()
  const rawSort = params.get('sort') as TeacherSort | null
  const values: TeacherSearchValues = {
    subject: params.get('subject') ?? '',
    level: params.get('level') ?? '',
    city: params.get('city') ?? '',
    online: parseBoolean(params.get('online'), true),
    inPerson: parseBoolean(params.get('inPerson'), true),
    priceMin: params.get('priceMin') ?? '',
    priceMax: params.get('priceMax') ?? '',
    verifiedOnly: parseBoolean(params.get('verified'), false),
    ratingMin: params.get('ratingMin') ?? '',
    sort: rawSort && validSorts.has(rawSort) ? rawSort : 'recommended',
    page: pageNumber(params.get('page')),
  }

  const subject = subjectsQuery.data?.find((item) => item.slug === values.subject)
  const level = levelsQuery.data?.find((item) => item.slug === values.level)
  const city = citiesQuery.data?.find((item) => item.slug === values.city)
  const isReady = !subjectsQuery.isPending && !levelsQuery.isPending && !citiesQuery.isPending
  const apiFilters: TeacherFilters = {
    subjectSlug: values.subject || undefined,
    levelId: level?.id,
    citySlug: values.city || undefined,
    onlineOk: values.online,
    inPersonOk: values.inPerson,
    budgetMin: positiveInteger(values.priceMin),
    budgetMax: positiveInteger(values.priceMax),
    verifiedOnly: values.verifiedOnly,
    ratingMin: decimal(values.ratingMin),
    sort: values.sort,
    page: values.page,
    limit: 20,
  }

  function apply(next: TeacherSearchValues) {
    const search = new URLSearchParams()
    setText(search, 'subject', next.subject)
    setText(search, 'level', next.level)
    setText(search, 'city', next.city)
    if (!next.online || !next.inPerson) {
      search.set('online', String(next.online))
      search.set('inPerson', String(next.inPerson))
    }
    setText(search, 'priceMin', next.priceMin)
    setText(search, 'priceMax', next.priceMax)
    if (next.verifiedOnly) search.set('verified', 'true')
    setText(search, 'ratingMin', next.ratingMin)
    if (next.sort !== 'recommended') search.set('sort', next.sort)
    if (next.page > 1) search.set('page', String(next.page))
    setParams(search)
  }

  function update(patch: Partial<TeacherSearchValues>, resetPage = true) {
    apply({ ...values, ...patch, page: resetPage ? 1 : (patch.page ?? values.page) })
  }

  return {
    values,
    apiFilters,
    isReady,
    subject,
    level,
    city,
    subjects: subjectsQuery.data ?? [],
    levels: levelsQuery.data ?? [],
    cities: citiesQuery.data ?? [],
    update,
    apply,
    clear: () => apply({
      subject: '',
      level: '',
      city: '',
      online: true,
      inPerson: true,
      priceMin: '',
      priceMax: '',
      verifiedOnly: false,
      ratingMin: '',
      sort: 'recommended',
      page: 1,
    }),
  }
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function positiveInteger(value: string | null) {
  const parsed = Number(value)
  return value && Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function pageNumber(value: string | null) {
  const parsed = Number(value)
  return value && Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

function decimal(value: string) {
  const parsed = Number(value)
  return value && Number.isFinite(parsed) ? parsed : undefined
}

function setText(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value)
}