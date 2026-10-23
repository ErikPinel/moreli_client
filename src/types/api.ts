export type UserRole = 'student' | 'teacher' | 'admin'

export type ProfileDto = {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  contact_email: string | null
  phone: string | null
  city_id: number | null
  avatar_path: string | null
}

export type SubjectDto = {
  id: number
  parent_id: number | null
  name_he: string
  name_en: string
  slug: string
  sort_order: number
}

export type CityDto = {
  id: number
  name_he: string
  name_en: string
  slug: string
  latitude: number | null
  longitude: number | null
}

export type TeacherProfileSummaryDto = {
  first_name: string
  last_name: string
  avatar_path: string | null
}

export type TeacherSubjectDto = {
  subject_id: number
  experience_years: number | null
  description: string | null
  subject: Pick<SubjectDto, 'id' | 'name_he' | 'name_en' | 'slug'>
}

export type TeacherServiceAreaDto = {
  city_id: number
  city: Pick<CityDto, 'id' | 'name_he' | 'name_en' | 'slug'>
}

export type PublicTeacherDto = {
  id: string
  slug: string
  headline: string
  bio: string
  hourly_price: number
  currency: string
  years_experience: number
  teaches_online: boolean
  teaches_in_person: boolean
  verification_status: 'unverified' | 'pending' | 'verified'
  average_rating: number
  review_count: number
  response_rate: number
  response_time_minutes: number | null
  is_founder: boolean
  published_at: string | null
  profile: TeacherProfileSummaryDto
  subjects: TeacherSubjectDto[]
  service_areas: TeacherServiceAreaDto[]
}

export type TeacherSearchResultDto = {
  items: PublicTeacherDto[]
  page: number
  limit: number
  hasMore: boolean
  meta: {
    page: number
    limit: number
    total: number
    pageCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export type SignedUrlDto = {
  signedUrl: string
}

export type PaginatedDto<T> = {
  items: T[]
  page: number
  limit: number
  hasMore: boolean
}

export type StudentRequestStatus = 'open' | 'matched' | 'closed' | 'cancelled'

export type StudentRequestDto = {
  id: string
  student_id: string | null
  subject_id: number
  city_id: number | null
  online_ok: boolean
  in_person_ok: boolean
  budget_min: number | null
  budget_max: number | null
  desired_start_at: string | null
  goal: string
  notes: string | null
  status: StudentRequestStatus
  created_at: string
  updated_at: string
}

export type RankedTeacherDto = {
  teacher_id: string
  score: number
  rank: number
  subject_score: number
  availability_score: number
  location_score: number
  budget_score: number
  quality_score: number
  status?: 'suggested' | 'viewed' | 'contacted' | 'dismissed'
  teacher: PublicTeacherDto
}

export type InquiryStatus = 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

export type LessonPersonDto = Pick<ProfileDto, 'id' | 'first_name' | 'last_name' | 'phone' | 'contact_email'>
export type LessonDto = {
  id: string
  teacher_id: string
  student_id: string
  connection_inquiry_id: string
  source_inquiry_id: string | null
  starts_at: string | null
  ends_at: string | null
  mode: 'online' | 'in_person' | null
  status: 'needs_scheduling' | 'scheduled' | 'completed' | 'cancelled' | 'no_show_reported'
  student_completed_at: string | null
  teacher_completed_at: string | null
  note: string | null
  revision: number
  created_at: string
  updated_at: string
  student: LessonPersonDto
  teacher: { id: string; user_id: string; slug: string; headline: string; profile: Omit<LessonPersonDto, 'id'> }
}

export type InquiryDto = {
  lesson?: { id: string } | null
  lesson_status?: 'needs_scheduling' | 'awaiting' | 'completed' | 'cancelled' | 'no_show_reported' | null
  student_completed_at?: string | null
  teacher_completed_at?: string | null
  lesson_updated_at?: string | null
  lesson_note?: string | null
  id: string
  student_id: string
  teacher_id: string
  request_id: string | null
  message: string
  requested_start_at: string | null
  requested_end_at: string | null
  lesson_mode: 'online' | 'in_person' | null
  status: InquiryStatus
  created_at: string
  viewed_at: string | null
  responded_at: string | null
  teacher?: PublicTeacherDto & {
    profile: TeacherProfileSummaryDto & { contact_email?: string | null; phone?: string | null }
  }
  student?: ProfileDto
}

export type ReviewDto = {
  id: string
  inquiry_id: string | null
  student_id: string
  teacher_id: string
  rating: number
  body: string | null
  status: 'pending' | 'published' | 'hidden' | 'rejected'
  created_at: string
  updated_at: string
  teacher_reply: string | null
  teacher_reply_status: 'pending' | 'published' | 'rejected' | null
  teacher_reply_at: string | null
}

export type ReceivedReviewDto = Pick<ReviewDto, 'id' | 'rating' | 'body' | 'created_at' | 'updated_at' | 'teacher_reply' | 'teacher_reply_status' | 'teacher_reply_at'>

export type SupportContactDto = { email: string; phone: string; monthlyPriceIls: number; automaticPaymentsAvailable: boolean }
export type ManualAccessPaymentDto = { id: string; status: 'pending' | 'approved' | 'rejected'; amount_ils: number; created_at: string; reviewed_at: string | null; review_note: string | null; period_start_at: string | null; period_end_at: string | null; reference?: string; teacher_id?: string; reconsideration_of?: string | null; support_ticket_id?: string | null; reviewed_by?: string | null; reviewer?: { id: string; first_name: string; last_name: string; contact_email: string | null } | null; teacher?: { id: string; slug: string; profile: { first_name: string; last_name: string; contact_email: string | null; phone?: string | null } } | null }
export type TeacherAccessDto = { freeContactUsed: boolean; paidUntil: string | null; active: boolean; canAcceptNewContact: boolean; priceIls: number; period: 'month'; paymentMethod: 'Bit'; payments: ManualAccessPaymentDto[] }
export type LessonCalendarDto = { timezone: string; locationName: string; locationFallback: boolean; usesDefault: boolean; duration: number; shabbat: { startAt: string; endAt: string }[]; days: { date: string; label: string; times: { time: string; startAt: string; endAt: string }[] }[] }
export type SupportTicketDto = { id: string; user_id: string; category: 'support' | 'bug' | 'billing' | 'report' | 'onboarding'; subject: string; message: string; status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'rejected'; created_at: string; updated_at: string; teacher_id: string | null; inquiry_id: string | null; lesson_id?: string | null; workflow?: 'onboarding' | 'payment' | null; payment_id?: string | null; review_id?: string | null; messages?: { id: string; body: string; author_role: 'user' | 'admin' | 'system'; created_at: string }[]; requester_teacher?: { id: string; slug: string } | null }

export type NotificationDto = {
  id: string
  type: string
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

export type AvailabilitySlotDto = {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
}

export type TeacherOnboardingDto = {
  availability_customized?: boolean
  support_ticket_id?: string | null
  review_reason?: string | null
  id: string
  user_id: string
  slug: string
  headline: string
  bio: string
  hourly_price: number
  currency: string
  years_experience: number
  teaches_online: boolean
  teaches_in_person: boolean
  verification_status: 'unverified' | 'pending' | 'verified'
  profile_status: 'draft' | 'pending' | 'published' | 'suspended'
  published_at: string | null
  profile: ProfileDto
  subjects: Array<{
    subject_id: number
    experience_years: number | null
    description: string | null
  }>
  service_areas: Array<{ city_id: number }>
  availability: AvailabilitySlotDto[]
}
