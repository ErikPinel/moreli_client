import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Heart, Laptop, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { useCanSaveTeacher } from '@/features/account/account-view'
import { accountKeys, useFavorites } from '@/features/account/useAccountData'
import type { PublicTeacherDto } from '@/types/api'
import { TeacherAvatar } from './TeacherAvatar'

export function TeacherResultCard({ teacher, lessonMode, citySlug }: { teacher: PublicTeacherDto; lessonMode?: 'online' | 'inPerson'; citySlug?: string }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const name = `${teacher.profile.first_name} ${teacher.profile.last_name}`.trim()
  const subjects = teacher.subjects.map(item => item.subject.name_he).join(' · ')
  const city = (citySlug ? teacher.service_areas.find(area => area.city.slug === citySlug) : teacher.service_areas[0])?.city.name_he
  const location = lessonMode === 'online'
    ? 'אונליין · מכל מקום'
    : lessonMode === 'inPerson'
      ? [city, 'פרונטלי'].filter(Boolean).join(' · ')
      : [city, teacher.teaches_online ? 'אונליין' : null].filter(Boolean).join(' · ')
  const canSave = useCanSaveTeacher(teacher.slug)
  const favorites = useFavorites(canSave)
  const isSaved = Boolean(favorites.data?.some(item => item.id === teacher.id))
  const favorite = useMutation({
    mutationFn: () => apiRequest(endpoints.favorite(teacher.id), { method: isSaved ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.favorites })
      toast.success(isSaved ? 'המורה הוסר מהמועדפים' : 'המורה נשמר במועדפים')
    },
    onError: () => toast.error('לא הצלחנו לשמור את המורה'),
  })
  const favoriteControl = canSave
    ? <button type="button" onClick={() => favorite.mutate()} disabled={favorite.isPending || favorites.isPending || favorites.isError} aria-pressed={isSaved} aria-label={isSaved ? `הסרת ${name} מהמועדפים` : `שמירת ${name} למועדפים`} title={isSaved ? 'הסרה מהמועדפים' : 'שמירה למועדפים'}><Heart fill={isSaved ? 'currentColor' : 'none'} /></button>
    : profile ? null : <Link to="/login?intent=student" aria-label={`שמירת ${name} למועדפים`}><Heart /></Link>

  return (
    <article className="teacher-result-card">
      <Link className="teacher-result-card__hit-area" to={`/teachers/${teacher.slug}`} aria-label={`לפרופיל של ${name}`} />
      <div className="teacher-result-card__photo"><TeacherAvatar slug={teacher.slug} name={name} avatarPath={teacher.profile.avatar_path} /></div>
      <div className="teacher-result-card__body">
        <header><div><h2><bdi>{name}</bdi>{teacher.verification_status === 'verified' ? <BadgeCheck aria-label="מורה מאומת" /> : null}</h2><span className="teacher-result-rating"><Star aria-hidden="true" />{teacher.review_count > 0 ? <><bdi>{Number(teacher.average_rating).toFixed(1)}</bdi> <small>({teacher.review_count} {teacher.review_count === 1 ? 'ביקורת' : 'ביקורות'})</small></> : 'ללא ביקורות עדיין'}</span></div>{favoriteControl}</header>
        <p className="teacher-result-card__subjects" title={subjects}>{subjects}</p>
        <p className="teacher-result-card__location">{lessonMode === 'online' || !teacher.teaches_in_person ? <Laptop aria-hidden="true" /> : <MapPin aria-hidden="true" />}{location}</p>
        <p className="teacher-result-card__bio">{teacher.bio || teacher.headline}</p>
        <span className="teacher-result-card__availability">בחירת מועד ובקשת שיעור בפרופיל</span>
      </div>
      <footer><div className="teacher-result-card__price"><strong><bdi>{formatMoney(teacher.hourly_price, teacher.currency)}</bdi></strong><span>לשעה</span></div><span className="teacher-result-card__profile-label">לפרופיל המורה</span></footer>
    </article>
  )
}

export function TeacherResultCardSkeleton() {
  return <div className="teacher-result-skeleton" aria-hidden="true"><span /><div><i /><i /><i /><i /></div><b /></div>
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}