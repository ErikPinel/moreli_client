import { useUser } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  BookOpen,
  Check,
  CircleUserRound,
  Laptop,
  MapPin,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useCities } from '@/features/search/hooks/useTaxonomies'
import { CatalogCombobox } from '@/features/search/components/CatalogCombobox'
import { AccountShell } from '@/features/account/AccountShell'
import type { ProfileDto } from '@/types/api'

type ProfilePageProps = {
  kind: 'student' | 'teacher'
}

type TeacherProfileDto = {
  id: string
  slug: string
  headline: string
  bio: string
  hourly_price: number
  currency: string
  years_experience: number
  teaches_online: boolean
  teaches_in_person: boolean
  profile_status: 'draft' | 'pending' | 'published' | 'suspended'
  verification_status: 'unverified' | 'pending' | 'verified'
}

export function ProfilePage({ kind }: ProfilePageProps) {
  const { profile, user } = useAuth()
  const { user: clerkUser } = useUser()
  const teacherQuery = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: () => apiRequest<TeacherProfileDto>(endpoints.currentTeacher),
    enabled: kind === 'teacher',
  })

  if (!profile || !user) return null

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'החשבון שלי'
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? ''

  if (kind === 'student') return <AccountShell title="הפרופיל שלי" description="פרטי הקשר שלך">
    <div className="student-next-actions"><Link className="button-link" to="/teachers"><BookOpen />מציאת מורה</Link><Link className="button-link" to="/student/inquiries">הפניות שלי</Link><Link className="button-link" to="/student/requests">התאמות לפי מטרת לימוד</Link></div>
    <PersonalProfileForm profile={profile} email={email} />
  </AccountShell>

  return (
    <div className="profile-page" dir="rtl">
      <Header />
      <main>
        <header className="profile-hero">
          <div className="page-shell profile-hero__inner">
            <div className="profile-avatar" aria-hidden="true">
              {user.imageUrl ? <img src={user.imageUrl} alt="" /> : <CircleUserRound />}
            </div>
            <div>
              <p className="profile-eyebrow">{kind === 'teacher' ? 'פרופיל מורה' : 'אזור אישי'}</p>
              <h1>{displayName}</h1>
              <p>{kind === 'teacher' ? 'עדכון הנוכחות המקצועית שלך במורהלי' : 'הפרטים וההעדפות של החשבון שלך'}</p>
            </div>
            <ProfileStatus kind={kind} teacher={teacherQuery.data} />
          </div>
        </header>

        <div className="page-shell profile-layout">
          <aside className="profile-nav" aria-label="חלקי הפרופיל">
            <a href="#personal"><CircleUserRound />פרטים אישיים</a>
            {kind === 'teacher' ? <a href="#professional"><BookOpen />פרופיל מקצועי</a> : null}
            <div className="profile-nav__trust">
              <ShieldCheck aria-hidden="true" />
              <p><strong>הפרטים נשמרים בבטחה</strong><span>רק מידע שבחרת לפרסם יוצג לאחרים.</span></p>
            </div>
          </aside>

          <div className="profile-content">
            <PersonalProfileForm profile={profile} email={email} />
            {kind === 'teacher' ? (
              teacherQuery.isPending ? (
                <div className="profile-loading" role="status"><Spinner /><span>טוען פרופיל מקצועי...</span></div>
              ) : teacherQuery.isError || !teacherQuery.data ? (
                <div className="profile-error" role="alert">
                  <p>לא הצלחנו לטעון את הפרופיל המקצועי.</p>
                  <Button variant="outline" onClick={() => void teacherQuery.refetch()}>נסו שוב</Button>
                </div>
              ) : (
                <TeacherProfileForm teacher={teacherQuery.data} />
              )
            ) : (
              <StudentProfileNote />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function PersonalProfileForm({ profile, email }: { profile: ProfileDto; email: string }) {
  const queryClient = useQueryClient()
  const citiesQuery = useCities()
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [selectedCity, setSelectedCity] = useState<string>()
  const citySlug = selectedCity ?? citiesQuery.data?.find((item) => item.id === profile.city_id)?.slug ?? ''
  const updateProfile = useMutation({
    mutationFn: () => apiRequest<ProfileDto>(endpoints.currentUser, {
      method: 'PATCH',
      body: { firstName, lastName, phone, citySlug },
    }),
    onSuccess: (updatedProfile) => {
      queryClient.setQueriesData<ProfileDto>({ queryKey: ['profile'] }, updatedProfile)
      toast.success('הפרטים האישיים נשמרו')
    },
    onError: () => toast.error('לא הצלחנו לשמור את הפרטים'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!citySlug) { toast.error('בחרו עיר מגורים'); return }
    updateProfile.mutate()
  }

  return (
    <section className="profile-panel" id="personal" aria-labelledby="personal-title">
      <div className="profile-panel__heading">
        <div><span>01</span><h2 id="personal-title">פרטים אישיים</h2></div>
        <p>המידע שמשמש אותנו כדי לזהות את החשבון וליצור איתך קשר.</p>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-form__row">
          <ProfileField label="שם פרטי" htmlFor="first-name">
            <Input id="first-name" value={firstName} maxLength={100} required onChange={(event) => setFirstName(event.target.value)} />
          </ProfileField>
          <ProfileField label="שם משפחה" htmlFor="last-name">
            <Input id="last-name" value={lastName} maxLength={100} required onChange={(event) => setLastName(event.target.value)} />
          </ProfileField>
        </div>
        <div className="profile-form__row">
          <ProfileField label="אימייל" htmlFor="email" hint="מנוהל דרך חשבון Clerk">
            <Input id="email" value={email} dir="ltr" disabled />
          </ProfileField>
          <ProfileField label="טלפון" htmlFor="phone" hint="לא יוצג בפרופיל ציבורי">
            <Input id="phone" value={phone} dir="ltr" inputMode="tel" maxLength={30} placeholder="050-0000000" required onChange={(event) => setPhone(event.target.value)} />
          </ProfileField>
        </div>
        <CatalogCombobox catalog="cities" value={citySlug} onChange={setSelectedCity} label="עיר מגורים" placeholder="בחרו עיר" />
        <ProfileActions isPending={updateProfile.isPending} />
      </form>
    </section>
  )
}

function TeacherProfileForm({ teacher }: { teacher: TeacherProfileDto }) {
  const queryClient = useQueryClient()
  const [headline, setHeadline] = useState(teacher.headline)
  const [bio, setBio] = useState(teacher.bio)
  const [hourlyPrice, setHourlyPrice] = useState(String(teacher.hourly_price))
  const [yearsExperience, setYearsExperience] = useState(String(teacher.years_experience))
  const [teachesOnline, setTeachesOnline] = useState(teacher.teaches_online)
  const [teachesInPerson, setTeachesInPerson] = useState(teacher.teaches_in_person)
  const updateTeacher = useMutation({
    mutationFn: () => apiRequest<TeacherProfileDto>(endpoints.currentTeacher, {
      method: 'PATCH',
      body: {
        headline,
        bio,
        hourlyPrice: Number(hourlyPrice),
        currency: teacher.currency,
        yearsExperience: Number(yearsExperience),
        teachesOnline,
        teachesInPerson,
      },
    }),
    onSuccess: (updatedTeacher) => {
      queryClient.setQueryData(['teacher-profile'], updatedTeacher)
      toast.success('הפרופיל המקצועי נשמר')
    },
    onError: () => toast.error('לא הצלחנו לשמור את הפרופיל המקצועי'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateTeacher.mutate()
  }

  return (
    <section className="profile-panel" id="professional" aria-labelledby="professional-title">
      <div className="profile-panel__heading">
        <div><span>02</span><h2 id="professional-title">הפרופיל המקצועי</h2></div>
        <p>כך תלמידים יכירו את סגנון ההוראה והניסיון שלך.</p>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <ProfileField label="כותרת מקצועית" htmlFor="headline" hint={`${headline.length}/200`}>
          <Input id="headline" value={headline} maxLength={200} placeholder="מורה למתמטיקה שמפשט גם את הנושאים המורכבים" onChange={(event) => setHeadline(event.target.value)} />
        </ProfileField>
        <ProfileField label="קצת עליי" htmlFor="bio" hint={`${bio.length}/5000`}>
          <Textarea id="bio" value={bio} maxLength={5000} rows={7} placeholder="ספרו על הניסיון, הגישה והשיעורים שלכם..." onChange={(event) => setBio(event.target.value)} />
        </ProfileField>
        <div className="profile-form__row">
          <ProfileField label="מחיר לשעה" htmlFor="hourly-price">
            <div className="profile-number-input"><Input id="hourly-price" type="number" min="0" max="100000" value={hourlyPrice} onChange={(event) => setHourlyPrice(event.target.value)} /><span>₪</span></div>
          </ProfileField>
          <ProfileField label="שנות ניסיון" htmlFor="years-experience">
            <Input id="years-experience" type="number" min="0" max="80" value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} />
          </ProfileField>
        </div>
        <fieldset className="profile-modes">
          <legend>איפה מתקיימים השיעורים?</legend>
          <label className={teachesOnline ? 'is-selected' : ''}>
            <input type="checkbox" checked={teachesOnline} onChange={(event) => setTeachesOnline(event.target.checked)} />
            <Laptop aria-hidden="true" /><span><strong>אונליין</strong><small>שיעורים מכל מקום</small></span><Check className="profile-mode__check" />
          </label>
          <label className={teachesInPerson ? 'is-selected' : ''}>
            <input type="checkbox" checked={teachesInPerson} onChange={(event) => setTeachesInPerson(event.target.checked)} />
            <MapPin aria-hidden="true" /><span><strong>פרונטלי</strong><small>מפגש באזורי השירות שלך</small></span><Check className="profile-mode__check" />
          </label>
        </fieldset>
        <ProfileActions isPending={updateTeacher.isPending} />
      </form>
    </section>
  )
}

function ProfileField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return <label className="profile-field" htmlFor={htmlFor}><span>{label}{hint ? <small>{hint}</small> : null}</span>{children}</label>
}

function ProfileActions({ isPending }: { isPending: boolean }) {
  return <div className="profile-actions"><Button type="submit" disabled={isPending}>{isPending ? <Spinner /> : <Save />}{isPending ? 'שומר...' : 'שמירת שינויים'}</Button></div>
}

function ProfileStatus({ kind, teacher }: { kind: ProfilePageProps['kind']; teacher?: TeacherProfileDto }) {
  if (kind === 'student') return <div className="profile-status is-active"><BadgeCheck />חשבון תלמיד פעיל</div>
  const label = teacher?.profile_status === 'published' ? 'פרופיל מפורסם' : teacher?.profile_status === 'pending' ? 'ממתין לאישור' : teacher?.profile_status === 'suspended' ? 'פרופיל מושהה' : 'טיוטה'
  return <div className={`profile-status ${teacher?.profile_status === 'published' ? 'is-active' : ''}`}><BadgeCheck />{label}</div>
}

function StudentProfileNote() {
  return (
    <section className="student-profile-note">
      <div><BookOpen aria-hidden="true" /></div>
      <div><h2>החיפוש שלך, במקום אחד</h2><p>בקשות, פניות ומורים ששמרת יופיעו באזור האישי ככל שתתקדם בתהליך.</p></div>
    </section>
  )
}