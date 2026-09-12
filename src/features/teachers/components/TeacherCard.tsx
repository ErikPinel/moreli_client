import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Heart, Laptop, MapPin, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { accountKeys } from '@/features/account/useAccountData'
import type { PublicTeacherDto } from '@/types/api'
import { TeacherAvatar } from './TeacherAvatar'

type TeacherCardProps = {
  teacher: PublicTeacherDto
  profilePath?: string
  availabilityLabel?: string
}

export function TeacherCard({ teacher, profilePath, availabilityLabel }: TeacherCardProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isSaved, setIsSaved] = useState(false)
  const favorite = useMutation({
    mutationFn: () => apiRequest(endpoints.favorite(teacher.id), { method: 'POST' }),
    onSuccess: () => {
      setIsSaved(true)
      void queryClient.invalidateQueries({ queryKey: accountKeys.favorites })
      toast.success('המורה נשמר במועדפים')
    },
    onError: () => toast.error('לא הצלחנו לשמור את המורה'),
  })
  const name = `${teacher.profile.first_name} ${teacher.profile.last_name}`.trim()
  const subject = teacher.subjects[0]?.subject.name_he
  const level = teacher.levels[0]?.level.name_he
  const city = teacher.service_areas[0]?.city.name_he
  const availability = availabilityLabel ?? (teacher.teaches_online ? 'זמינות השבוע' : null)
  const teacherPath = profilePath ?? `/teachers/${teacher.slug}`

  return (
    <article className="teacher-card">
      <Link className="teacher-card__hit-area" to={teacherPath} aria-label={`לפרופיל של ${name}`} />
      <div className="teacher-card__image">
        <TeacherAvatar
          slug={teacher.slug}
          name={name}
          avatarPath={teacher.profile.avatar_path}
        />
        {profile?.role === 'student' ? <button
          className={`teacher-card__favorite ${isSaved ? 'is-saved' : ''}`}
          type="button"
          onClick={() => favorite.mutate()}
          disabled={favorite.isPending || isSaved}
          aria-label={`שמירת ${name} למועדפים`}
          title="שמירה למועדפים"
        >
          <Heart className="size-4" aria-hidden="true" />
        </button> : <Link className="teacher-card__favorite" to="/login?intent=student" aria-label={`שמירת ${name} למועדפים`} title="שמירה למועדפים"><Heart className="size-4" aria-hidden="true" /></Link>}
        {availability ? (
          <span className="teacher-card__availability">
            {availability}
          </span>
        ) : null}
      </div>

      <div className="teacher-card__content">
        <div className="teacher-card__identity">
          <div className="teacher-card__name-row">
            <h3>{name}</h3>
            {teacher.verification_status === 'verified' ? (
              <BadgeCheck className="teacher-card__verified" aria-label="מורה מאומת" />
            ) : null}
          </div>
          <span className="teacher-card__rating">
            <Star aria-hidden="true" />
            {Number(teacher.average_rating).toFixed(1)}
            <span>({teacher.review_count})</span>
          </span>
        </div>

        <p className="teacher-card__subject">
          {[subject, level].filter(Boolean).join(' · ') || teacher.headline}
        </p>
        <p className="teacher-card__location">
          {city ? <MapPin aria-hidden="true" /> : <Laptop aria-hidden="true" />}
          {[city, teacher.teaches_online ? 'אונליין' : null].filter(Boolean).join(' · ')}
        </p>

        <div className="teacher-card__footer">
          <p className="teacher-card__price">
            <strong>
              {formatMoney(teacher.hourly_price, teacher.currency)}
            </strong> לשעה
          </p>
          <span className="teacher-card__link">
            לפרופיל המורה
          </span>
        </div>
      </div>
    </article>
  )
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}