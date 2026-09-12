export type TeacherFilters = {
  subjectSlug?: string
  levelId?: number
  citySlug?: string
  budgetMin?: number
  budgetMax?: number
  onlineOk?: boolean
  inPersonOk?: boolean
  verifiedOnly?: boolean
  ratingMin?: number
  sort?: 'recommended' | 'rating' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export const teacherQueryKeys = {
  all: ['teachers'] as const,
  list: (filters: TeacherFilters) => ['teachers', 'list', filters] as const,
  detail: (slug: string) => ['teachers', 'detail', slug] as const,
  avatar: (slug: string) => ['teachers', 'avatar', slug] as const,
}