import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, Camera, Check, ChevronDown, Clock3, GraduationCap, MapPin, Save } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { AvatarCropDialog } from '@/features/account/AvatarCropDialog'
import { TimeSelect } from '@/features/account/TimeSelect'
import { AvailabilityGrid } from '@/features/account/AvailabilityGrid'
import { defaultAvailability } from '@/features/account/availability-grid'
import { accountKeys, useTeacherProfile } from '@/features/account/useAccountData'
import { clearOnboardingDraft, readOnboardingDraft, writeOnboardingDraft, type OnboardingDraft } from '@/features/account/onboarding-draft'
import { UnsavedChangesDialog } from '@/features/account/UnsavedChangesDialog'
import { useCities, useSubjects } from '@/features/search/hooks/useTaxonomies'
import { CatalogCombobox } from '@/features/search/components/CatalogCombobox'
import { catalogs } from '@/data/catalogs'
import type { AvailabilitySlotDto, ProfileDto, SignedUrlDto, TeacherOnboardingDto } from '@/types/api'

type EditableSlot = Pick<AvailabilitySlotDto, 'day_of_week' | 'start_time' | 'end_time'>
type UploadUrl = { signedUrl: string; path: string; token: string }

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const stepFields = [
  ['firstName', 'lastName', 'email', 'phone', 'city', 'avatar'],
  ['headline', 'bio', 'price', 'experience', 'mode'],
  ['subjects', 'areas'],
  ['availability'],
] as const
type OnboardingField = typeof stepFields[number][number] | 'terms'

export function TeachClaimPage() {
  const { profile } = useAuth()
  if (profile?.role === 'teacher') return <Navigate replace to="/teacher/dashboard" />
  if (!profile || profile.role !== 'student') return <Navigate replace to="/" />
  return <TeacherOnboardingForm isNew teacher={{ profile, profile_status: 'draft', headline: '', bio: '', hourly_price: 0, years_experience: 0, teaches_online: true, teaches_in_person: false, subjects: [], service_areas: [], availability: [], currency: 'ILS', slug: '', review_reason: null }} />
}

export function TeacherOnboardingPage() {
  const teacherQuery = useTeacherProfile()
  if (teacherQuery.isPending) return <AccountShell title="השלמת הפרופיל" description=""><WorkspaceState>טוען את פרופיל המורה...</WorkspaceState></AccountShell>
  if (teacherQuery.isError || !teacherQuery.data) return <AccountShell title="השלמת הפרופיל" description=""><WorkspaceState tone="error">לא הצלחנו לטעון את הפרופיל.</WorkspaceState></AccountShell>
  return <TeacherOnboardingForm teacher={teacherQuery.data} />
}

type FormTeacher = Pick<TeacherOnboardingDto, 'profile' | 'profile_status' | 'headline' | 'bio' | 'hourly_price' | 'years_experience' | 'teaches_online' | 'teaches_in_person' | 'subjects' | 'service_areas' | 'availability' | 'availability_customized' | 'currency' | 'slug' | 'review_reason' | 'support_ticket_id'>

function TeacherOnboardingForm({ teacher, isNew = false }: { teacher: FormTeacher; isNew?: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const draftOwner = user ? `${user.id}:${isNew ? 'new' : 'edit'}` : null
  const [restoredDraft] = useState(() => {
    try { return draftOwner ? readOnboardingDraft(sessionStorage, draftOwner) : null } catch { return null }
  })
  const [savedDraft, setSavedDraft] = useState<OnboardingDraft | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [validatedFields, setValidatedFields] = useState<Set<OnboardingField>>(() => new Set())
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [avatarPath, setAvatarPath] = useState(restoredDraft?.avatarPath ?? teacher.profile.avatar_path)
  const [avatarPending, setAvatarPending] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const subjectsQuery = useSubjects()
  const citiesQuery = useCities()
  const [firstName, setFirstName] = useState(restoredDraft?.firstName ?? teacher.profile.first_name)
  const [lastName, setLastName] = useState(restoredDraft?.lastName ?? teacher.profile.last_name)
  const [phone, setPhone] = useState(restoredDraft?.phone ?? teacher.profile.phone ?? '')
  const [selectedCity, setSelectedCity] = useState<string | undefined>(restoredDraft?.citySlug)
  const citySlug = selectedCity ?? citiesQuery.data?.find((item) => item.id === teacher.profile.city_id)?.slug ?? ''
  const [headline, setHeadline] = useState(restoredDraft?.headline ?? teacher.headline)
  const [bio, setBio] = useState(restoredDraft?.bio ?? teacher.bio)
  const [price, setPrice] = useState(restoredDraft?.price ?? String(teacher.hourly_price || ''))
  const [experience, setExperience] = useState(restoredDraft?.experience ?? (isNew ? '' : String(teacher.years_experience)))
  const [online, setOnline] = useState(restoredDraft?.online ?? teacher.teaches_online)
  const [inPerson, setInPerson] = useState(restoredDraft?.inPerson ?? teacher.teaches_in_person)
  const [selectedSubjects, setSelectedSubjects] = useState<string[] | undefined>(restoredDraft?.subjectSlugs)
  const subjectSlugs = selectedSubjects ?? teacher.subjects.flatMap((item) => {
    const subject = subjectsQuery.data?.find((subject) => subject.id === item.subject_id)
    return subject ? [subject.slug] : []
  })
  const [selectedAreas, setSelectedAreas] = useState<string[] | undefined>(restoredDraft?.citySlugs)
  const citySlugs = selectedAreas ?? teacher.service_areas.flatMap((item) => {
    const city = citiesQuery.data?.find((city) => city.id === item.city_id)
    return city ? [city.slug] : []
  })
  const [slots, setSlots] = useState<EditableSlot[]>(() => restoredDraft?.slots ?? (isNew || teacher.availability_customized === false ? defaultAvailability() : teacher.availability.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time: start_time.slice(0, 5), end_time: end_time.slice(0, 5) }))))
  const [saveError, setSaveError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const catalogsReady = subjectsQuery.isSuccess && citiesQuery.isSuccess
  const currentDraft: OnboardingDraft = { firstName, lastName, phone, citySlug, avatarPath, headline, bio, price, experience, online, inPerson, subjectSlugs, citySlugs, slots }
  const serverDraft: OnboardingDraft = {
    firstName: teacher.profile.first_name, lastName: teacher.profile.last_name, phone: teacher.profile.phone ?? '', citySlug: citiesQuery.data?.find(item => item.id === teacher.profile.city_id)?.slug ?? '', avatarPath: teacher.profile.avatar_path,
    headline: teacher.headline, bio: teacher.bio, price: String(teacher.hourly_price || ''), experience: isNew ? '' : String(teacher.years_experience), online: teacher.teaches_online, inPerson: teacher.teaches_in_person,
    subjectSlugs: teacher.subjects.flatMap(item => subjectsQuery.data?.find(subject => subject.id === item.subject_id)?.slug ?? []), citySlugs: teacher.service_areas.flatMap(item => citiesQuery.data?.find(city => city.id === item.city_id)?.slug ?? []),
    slots: isNew || teacher.availability_customized === false ? defaultAvailability() : teacher.availability.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time: start_time.slice(0, 5), end_time: end_time.slice(0, 5) })),
  }
  const draftJson = JSON.stringify(currentDraft)
  const isDirty = catalogsReady ? draftJson !== JSON.stringify(savedDraft ?? serverDraft) : Boolean(restoredDraft)
  useEffect(() => {
    if (!draftOwner || !isDirty) return
    try { writeOnboardingDraft(sessionStorage, draftOwner, JSON.parse(draftJson) as OnboardingDraft) } catch { return }
  }, [draftOwner, isDirty, draftJson])
  const slotErrors = slots.flatMap((slot, index) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end_time) || slot.start_time >= slot.end_time) return [`חלון ${index + 1}: שעת הסיום חייבת להיות אחרי שעת ההתחלה`]
    if (slots.some((other, otherIndex) => otherIndex < index && other.day_of_week === slot.day_of_week && other.start_time < slot.end_time && slot.start_time < other.end_time)) return [`חלון ${index + 1}: קיימת חפיפה ביום ${days[slot.day_of_week]}`]
    return []
  })
  const fieldErrors: Record<OnboardingField, string> = {
    firstName: firstName.trim() ? '' : 'יש למלא שם פרטי.',
    lastName: lastName.trim() ? '' : 'יש למלא שם משפחה.',
    email: teacher.profile.contact_email ? '' : 'נדרשת כתובת אימייל מאומתת בחשבון.',
    phone: phone.trim().length >= 7 ? '' : 'יש למלא מספר טלפון תקין, לפחות 7 תווים.',
    city: citySlug ? '' : 'יש לבחור עיר מגורים מהרשימה.',
    avatar: avatarPending ? 'יש להמתין לסיום העלאת התמונה.' : avatarPath ? '' : 'יש להעלות תמונת פרופיל.',
    headline: headline.trim() ? '' : 'יש למלא כותרת מקצועית.',
    bio: bio.trim() ? '' : 'יש לכתוב כמה מילים עליכם ועל הניסיון שלכם.',
    price: Number.isInteger(Number(price)) && Number(price) >= 1 && Number(price) <= 100000 ? '' : 'יש למלא מחיר שלם בין 1 ל-100,000 ש״ח.',
    experience: experience.trim() && Number.isInteger(Number(experience)) && Number(experience) >= 0 && Number(experience) <= 80 ? '' : 'יש למלא שנות ניסיון בין 0 ל-80. אפשר גם 0.',
    mode: online || inPerson ? '' : 'יש לבחור לפחות אופן לימוד אחד.',
    subjects: subjectSlugs.length ? '' : 'יש לבחור לפחות מקצוע הוראה אחד.',
    areas: inPerson && !citySlugs.length ? 'יש לבחור לפחות עיר אחת לשיעורים פנים אל פנים.' : '',
    availability: !slots.length ? 'יש להוסיף לפחות חלון זמינות שבועי אחד.' : slotErrors.join('. '),
    terms: isNew && !acceptedTerms ? 'יש לאשר את תנאי השימוש והוספת פרופיל המורה.' : '',
  }
  const stepMissing = stepFields.map((fields) => fields.map((field) => fieldErrors[field]).filter(Boolean))
  const missing = [...stepMissing.flat(), ...(fieldErrors.terms ? [fieldErrors.terms] : [])]
  const firstIncompleteStep = stepMissing.findIndex((items) => items.length > 0)
  const errorId = useId()
  function validateFields(fields: readonly OnboardingField[]) {
    setValidatedFields((current) => new Set([...current, ...fields]))
  }
  function fieldState(field: OnboardingField) {
    const invalid = validatedFields.has(field) && Boolean(fieldErrors[field])
    return {
      'aria-invalid': invalid || undefined,
      'aria-describedby': invalid ? `${errorId}-${field}` : undefined,
      onBlur: () => validateFields([field]),
    }
  }
  function fieldError(field: OnboardingField) {
    return validatedFields.has(field) && fieldErrors[field]
      ? <p id={`${errorId}-${field}`} className="onboarding-field-error">{fieldErrors[field]}</p>
      : null
  }
  function showMissing(items: string[], step: number) {
    validateFields(stepFields[step])
    setSaveError(`יש להשלים או לתקן: ${items.join(' ')}`)
    setActiveStep(step)
    alertRef.current?.focus()
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  function openStep(step: number) {
    if (firstIncompleteStep !== -1 && firstIncompleteStep < step) {
      showMissing(stepMissing[firstIncompleteStep], firstIncompleteStep)
      return
    }
    setSaveError('')
    setActiveStep(step)
  }
  function continueStep(step: number) {
    openStep(step + 1)
  }
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.teacher })
    void queryClient.invalidateQueries({ queryKey: ['profile'] })
    void queryClient.invalidateQueries({ queryKey: accountKeys.schedule })
  }
  const save = useMutation({
    mutationFn: async (intent: 'draft' | 'review' | 'save') => {
      setSaveError('')
      setSavedMessage('')
      if (!catalogsReady) throw new Error('רשימות המקצועות והערים עדיין נטענות. נסו שוב בעוד רגע.')
      if ((intent === 'review' || teacher.profile_status === 'published') && missing.length) throw new Error(`יש להשלים: ${missing.join(', ')}`)
      if (isNew) {
        await apiRequest(`${endpoints.currentTeacher}/onboarding`, { method: 'POST', body: { acceptTerms: acceptedTerms, firstName, lastName, phone, citySlug, avatarPath, headline, bio, hourlyPrice: Number(price), yearsExperience: Number(experience), teachesOnline: online, teachesInPerson: inPerson, subjectSlugs, citySlugs, slots: slots.map((slot) => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })) } })
        return { submittedForReview: true }
      }
      await apiRequest(`${endpoints.currentTeacher}/profile`, { method: 'PUT', body: { firstName, lastName, phone, citySlug, avatarPath: avatarPath ?? '', headline, bio, hourlyPrice: Number(price), yearsExperience: Number(experience), teachesOnline: online, teachesInPerson: inPerson, subjectSlugs, citySlugs, slots: slots.map(slot => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })), submitForReview: intent === 'review' } })
      return { submittedForReview: intent === 'review' }
    },
    onSuccess: async ({ submittedForReview }, intent) => {
      setSavedDraft(currentDraft)
      try { if (draftOwner) clearOnboardingDraft(sessionStorage, draftOwner) } catch { /* Storage is optional. */ }
      if (submittedForReview) {
        setSavedMessage('הפרופיל נשלח לבדיקה. הוא עדיין אינו מופיע בחיפוש; ההחלטה תופיע כאן ותישלח באימייל.')
        toast.success(isNew ? 'פרופיל המורה נוסף לחשבון ונשלח לבדיקה. עברתם למצב מורה; מצב תלמיד זמין תמיד מהתפריט.' : 'הפרופיל נשמר ונשלח לבדיקה')
      } else {
        setSavedMessage(intent === 'draft' ? 'הטיוטה נשמרה. היא פרטית ולא נשלחה לבדיקה.' : 'השינויים נשמרו.')
        toast.success('פרטי ההוראה נשמרו')
      }
      if (isNew) {
        await queryClient.invalidateQueries({ queryKey: ['profile'] })
        await queryClient.invalidateQueries({ queryKey: accountKeys.teacher })
        navigate('/teacher/onboarding', { replace: true })
      }
    },
    onError: (error) => {
      const message = isNew ? 'השליחה לא אושרה. הפרטים נשארו כאן. בדקו את החיבור ונסו שוב; אם התשובה אבדה לאחר שמירה, ניסיון חוזר לא ייצור חשבון נוסף.' : error instanceof Error && /[\u0590-\u05ff]/.test(error.message) ? error.message : 'לא התקבל אישור שמירה. הפרטים נשארו כאן; בדקו את החיבור ונסו שוב.'
      setSaveError(message)
      toast.error(message)
    },
    onSettled: refresh,
  })

  const addSlot = () => setSlots((current) => [...current, { day_of_week: 0, start_time: '09:00', end_time: '21:00' }])
  const updateSlot = (index: number, field: keyof EditableSlot, value: string | number) => setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = isNew || submitter?.value === 'review' ? 'review' : teacher.profile_status === 'draft' ? 'draft' : 'save'
    if ((intent !== 'draft' && missing.length) || slotErrors.length) {
      validateFields(intent === 'draft' ? ['availability'] : [...stepFields.flat(), 'terms'])
      showMissing(intent === 'draft' ? slotErrors : missing, intent === 'draft' ? 3 : Math.max(0, firstIncompleteStep))
      return
    }
    save.mutate(intent)
  }
  return <AccountShell title={teacher.profile_status === 'draft' ? 'השלמת פרופיל המורה' : 'פרטי ההוראה'} description="כל מה שתלמידים צריכים כדי להחליט אם לפנות אליכם." actions={teacher.profile_status === 'published' ? <span className="published-badge"><BadgeCheck />הפרופיל מפורסם</span> : teacher.profile_status === 'pending' ? <span className="published-badge is-pending"><Clock3 />ממתין לאישור</span> : null}>
    <UnsavedChangesDialog when={isDirty && !save.isPending} />
    {restoredDraft && !savedMessage ? <p role="status" className="profile-save-status">הטיוטה מהלשונית הזו שוחזרה. הפרטים עדיין לא נשלחו.</p> : null}
    {isNew ? <div className="onboarding-account-notice"><strong>החשבון שלך נשאר גם חשבון תלמיד.</strong> פרופיל המורה מתווסף אליו: אחרי השליחה אפשר לעבור בין מצב תלמיד למצב מורה מהתפריט, ולהמשיך לבקש שיעורים כרגיל. הפרופיל יופיע בחיפוש רק לאחר אישור מנהל.</div> : null}
    <p className="onboarding-progress" role="status">{stepMissing.filter((items) => !items.length).length} מתוך 4 שלבים הושלמו</p>
    {teacher.profile_status === 'published' ? <Link className="button-link" to={`/teachers/${teacher.slug}`}>צפייה בפרופיל הציבורי</Link> : null}
    {teacher.profile_status === 'pending' ? <WorkspaceState><Clock3 /><h2>הפרופיל בבדיקה</h2><p>הפרופיל עדיין אינו מופיע בחיפוש. ההחלטה תופיע כאן ותישלח באימייל.</p></WorkspaceState> : null}
    {teacher.support_ticket_id ? <aside className="support-billing-hint"><div><strong>השיחה על בדיקת הפרופיל</strong><p>ההחלטות ובקשות התיקון נשמרות באותה פנייה. לאחר תיקון ושליחה מחדש היא תחזור לצוות, בלי לפתוח פנייה חדשה.</p><Link className="button-link" to={`/support/${encodeURIComponent(teacher.support_ticket_id)}`}>לצפייה בפניית הבדיקה ולהוספת פרטים</Link></div></aside> : null}
    {teacher.profile_status === 'suspended' ? <WorkspaceState tone="error"><h2>הפרופיל מושהה</h2><p>הפרופיל אינו מופיע בחיפוש. עדכון פרטים אינו מבטל את ההשהיה; נדרשת בדיקת מנהל.</p></WorkspaceState> : null}
    {!catalogsReady ? <WorkspaceState>{subjectsQuery.isError || citiesQuery.isError ? <><p>לא הצלחנו לטעון את אפשרויות הפרופיל.</p><Button type="button" onClick={() => { void subjectsQuery.refetch(); void citiesQuery.refetch() }}>ניסיון נוסף</Button></> : 'טוען מקצועות וערים...'}</WorkspaceState> : null}
    {!isNew && teacher.profile_status === 'draft' && catalogsReady ? <div className="profile-readiness"><h2>{missing.length ? 'לפני שליחה לבדיקה' : 'הפרופיל מוכן לשליחה לבדיקה'}</h2>{missing.length ? <ul>{missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : null}
    {teacher.profile_status === 'draft' && teacher.review_reason ? <WorkspaceState tone="error"><h2>נדרשים תיקונים לפני פרסום</h2><p>{teacher.review_reason}</p></WorkspaceState> : null}
    <form className="onboarding-sections" onSubmit={submit} noValidate>
      <div ref={alertRef} tabIndex={-1} role={saveError ? 'alert' : undefined} className={saveError ? 'profile-save-error' : undefined}>{saveError}</div>
      <fieldset className="onboarding-fields" disabled={save.isPending || !catalogsReady}>
      <OnboardingStep index={0} title="זהות ופרטי קשר" open={activeStep === 0} missing={stepMissing[0]} onOpen={() => openStep(0)} onContinue={() => continueStep(0)}>
        <div className="onboarding-field">
          <div className="onboarding-field-group" role="group" aria-label="תמונת פרופיל" {...fieldState('avatar')}><AvatarUpload currentPath={avatarPath} onUploaded={setAvatarPath} onBusyChange={setAvatarPending} /></div>
          {fieldError('avatar')}
        </div>
        <div className="workspace-form__grid">
          <div className="onboarding-field"><label><span>שם פרטי</span><Input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} {...fieldState('firstName')} /></label>{fieldError('firstName')}</div>
          <div className="onboarding-field"><label><span>שם משפחה</span><Input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} {...fieldState('lastName')} /></label>{fieldError('lastName')}</div>
          <div className="onboarding-field"><label><span>אימייל מאומת</span><Input type="email" dir="ltr" value={teacher.profile.contact_email ?? ''} disabled {...fieldState('email')} /></label>{fieldError('email')}</div>
          <div className="onboarding-field"><label><span>טלפון</span><Input required type="tel" dir="ltr" inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} {...fieldState('phone')} /></label>{fieldError('phone')}</div>
          <div className="onboarding-field"><CatalogCombobox catalog="cities" value={citySlug} onChange={setSelectedCity} label="עיר מגורים" placeholder="בחרו עיר" {...fieldState('city')} />{fieldError('city')}</div>
        </div>
      </OnboardingStep>
      <OnboardingStep index={1} title="הצגה מקצועית" open={activeStep === 1} missing={stepMissing[1]} locked={firstIncompleteStep !== -1 && firstIncompleteStep < 1} onOpen={() => openStep(1)} onContinue={() => continueStep(1)}>
        <div className="onboarding-field"><label><span>כותרת מקצועית</span><Input required maxLength={200} value={headline} onChange={(event) => setHeadline(event.target.value)} {...fieldState('headline')} /></label>{fieldError('headline')}</div>
        <div className="onboarding-field"><label><span>אודות</span><Textarea required maxLength={5000} rows={7} value={bio} onChange={(event) => setBio(event.target.value)} {...fieldState('bio')} /></label>{fieldError('bio')}</div>
        <div className="workspace-form__grid">
          <div className="onboarding-field"><label><span>מחיר לשעה בשקלים</span><Input required type="number" min="1" max="100000" value={price} onChange={(event) => setPrice(event.target.value)} {...fieldState('price')} /></label>{fieldError('price')}</div>
          <div className="onboarding-field"><label><span>שנות ניסיון (0 למורים בתחילת הדרך)</span><Input required type="number" min="0" max="80" value={experience} onChange={(event) => setExperience(event.target.value)} {...fieldState('experience')} /></label>{fieldError('experience')}</div>
        </div>
        <div className="onboarding-field"><fieldset className="workspace-checks onboarding-field-group" {...fieldState('mode')}><legend>אופן הלימוד</legend><label><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} />אונליין</label><label><input type="checkbox" checked={inPerson} onChange={(event) => setInPerson(event.target.checked)} />פנים אל פנים</label></fieldset>{fieldError('mode')}</div>
      </OnboardingStep>
      <OnboardingStep index={2} title="מקצועות הוראה" open={activeStep === 2} missing={stepMissing[2]} locked={firstIncompleteStep !== -1 && firstIncompleteStep < 2} onOpen={() => openStep(2)} onContinue={() => continueStep(2)}>
        <div className="onboarding-field"><CatalogMultiSelect catalog="professions" selected={subjectSlugs} onChange={setSelectedSubjects} {...fieldState('subjects')} />{fieldError('subjects')}</div>
        {inPerson ? <div className="onboarding-field"><CatalogMultiSelect catalog="cities" selected={citySlugs} onChange={setSelectedAreas} {...fieldState('areas')} />{fieldError('areas')}</div> : null}
      </OnboardingStep>
      <OnboardingStep index={3} title="זמינות שבועית" open={activeStep === 3} missing={stepMissing[3]} locked={firstIncompleteStep !== -1 && firstIncompleteStep < 3} onOpen={() => openStep(3)}>
        <p>שעות הפעילות לפי שעון ישראל · תצוגת 24 שעות</p>
        <div className="onboarding-field-group" role="group" aria-label="חלונות זמינות" {...fieldState('availability')}>
        <AvailabilityGrid slots={slots} onChange={setSlots} disabled={save.isPending} />
        <div className="onboarding-schedule">{slots.map((slot, index) => <div className="onboarding-slot" key={index}><label><span>יום בשבוע</span><select value={slot.day_of_week} onChange={(event) => updateSlot(index, 'day_of_week', Number(event.target.value))}>{days.map((day, dayIndex) => <option value={dayIndex} key={day}>{day}</option>)}</select></label><TimeSelect label="שעת התחלה" value={slot.start_time} onChange={(value) => updateSlot(index, 'start_time', value)} /><TimeSelect label="שעת סיום" value={slot.end_time} onChange={(value) => updateSlot(index, 'end_time', value)} /><Button type="button" variant="ghost" aria-label={`הסרת חלון ${index + 1}`} onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}>הסרה</Button></div>)}</div><Button type="button" variant="outline" onClick={addSlot}><CalendarDays />הוספת חלון זמן</Button>
        </div>
        {fieldError('availability')}
      </OnboardingStep>
      </fieldset>
      {isNew ? <><label className="onboarding-consent"><input type="checkbox" checked={acceptedTerms} disabled={save.isPending} onChange={(event) => setAcceptedTerms(event.target.checked)} {...fieldState('terms')} />אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות ומבקש/ת להוסיף פרופיל מורה לחשבון שלי.</label>{fieldError('terms')}</> : null}
      {savedMessage ? <p role="status" className="profile-save-status">{savedMessage}</p> : null}
      <div className="onboarding-save">{!isNew ? <Button type="submit" disabled={save.isPending || avatarPending || !catalogsReady} variant={teacher.profile_status === 'draft' ? 'outline' : 'default'}><Save />{save.isPending ? 'שומר...' : teacher.profile_status === 'draft' ? 'שמירת טיוטה' : 'שמירת שינויים'}</Button> : null}{teacher.profile_status === 'draft' ? <Button type="submit" value="review" disabled={save.isPending || avatarPending || !catalogsReady}><BadgeCheck />{save.isPending ? 'שומר ושולח...' : 'שמירה ושליחה לבדיקה'}</Button> : null}{isNew ? <Link to="/student">ביטול וחזרה לחשבון התלמיד</Link> : null}</div>
    </form>
  </AccountShell>
}

function OnboardingStep({ index, title, open, missing, locked = false, onOpen, onContinue, children }: { index: number; title: string; open: boolean; missing: string[]; locked?: boolean; onOpen: () => void; onContinue?: () => void; children: ReactNode }) {
  return <details className="onboarding-step" open={open}><summary role="button" aria-expanded={open} aria-disabled={locked || undefined} aria-controls={`onboarding-step-${index}`} onClick={(event) => { event.preventDefault(); onOpen() }}><span className="onboarding-step__number">{locked || missing.length ? index + 1 : <Check aria-hidden="true" />}</span><span><strong>{title}</strong><small>{locked ? 'יש להשלים קודם את השלבים הקודמים' : missing.length === 1 ? 'נותר פרט אחד להשלמה' : missing.length ? `נותרו ${missing.length} פרטים להשלמה` : 'הושלם'}</small></span><ChevronDown aria-hidden="true" /></summary><div id={`onboarding-step-${index}`} className="onboarding-step__body">{children}{onContinue ? <Button type="button" className="onboarding-next" onClick={onContinue}>המשך לשלב הבא</Button> : null}</div></details>
}

function AvatarUpload({ currentPath, onUploaded, onBusyChange }: { currentPath: string | null; onUploaded: (path: string) => void; onBusyChange: (busy: boolean) => void }) {
  const queryClient = useQueryClient()
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const currentAvatar = useQuery({
    queryKey: ['storage', 'teacher-avatar', currentPath],
    queryFn: () => apiRequest<SignedUrlDto>(endpoints.storageReadUrl, { method: 'POST', body: { bucket: 'teacher-avatars', path: currentPath } }),
    enabled: Boolean(currentPath) && !previewImage,
    staleTime: 50 * 60_000,
  })
  const upload = useMutation({
    onMutate: () => onBusyChange(true),
    mutationFn: async (file: File) => {
      const signed = await apiRequest<UploadUrl>(endpoints.storageUploadUrl, { method: 'POST', body: { bucket: 'teacher-avatars', fileName: file.name } })
      const response = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!response.ok) throw new Error('Upload failed')
      await apiRequest<ProfileDto>(endpoints.currentUser, { method: 'PATCH', body: { avatarPath: signed.path } })
      return signed.path
    },
    onSuccess: (path, file) => {
      onUploaded(path)
      if (previewImage) URL.revokeObjectURL(previewImage)
      setPreviewImage(URL.createObjectURL(file))
      closeEditor()
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: accountKeys.teacher })
      toast.success('התמונה הותאמה והועלתה')
    },
    onError: () => toast.error('לא הצלחנו להעלות את התמונה'),
    onSettled: () => onBusyChange(false),
  })
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('אפשר לבחור תמונת JPEG, PNG או WebP בלבד')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('התמונה גדולה מדי. אפשר לבחור קובץ עד 20MB')
      return
    }
    setEditorImage(URL.createObjectURL(file))
  }
  function closeEditor() {
    if (editorImage) URL.revokeObjectURL(editorImage)
    setEditorImage(null)
  }
  const avatarImage = previewImage ?? currentAvatar.data?.signedUrl
  return <><div className="avatar-upload"><div>{avatarImage ? <img src={avatarImage} alt="תצוגה מקדימה של תמונת הפרופיל" /> : <Camera />}</div><label><Camera />{upload.isPending ? 'מעלה תמונה...' : currentPath ? 'החלפת תמונה' : 'בחירת תמונת פרופיל'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} disabled={upload.isPending} /></label><p>בחרו תמונה עד 20MB, מקמו את האזור החשוב והתאימו את הזום לפני השמירה.</p></div>{editorImage ? <AvatarCropDialog imageUrl={editorImage} isSaving={upload.isPending} onCancel={closeEditor} onError={() => toast.error('לא הצלחנו לעבד את התמונה')} onSave={(file) => upload.mutate(file)} /> : null}</>
}

function CatalogMultiSelect({ catalog, selected, onChange, ...validation }: { catalog: keyof typeof catalogs; selected: string[]; onChange: (slugs: string[]) => void; 'aria-invalid'?: boolean; 'aria-describedby'?: string; onBlur?: () => void }) {
  const isCity = catalog === 'cities'
  const title = isCity ? 'אזורי שירות' : 'מקצועות'
  return <fieldset className="subject-multi-select"><legend>{isCity ? <MapPin /> : <GraduationCap />}{title}</legend><CatalogCombobox catalog={catalog} value="" excluded={selected} selected={selected} onRemove={(removed) => onChange(selected.filter((slug) => slug !== removed))} onChange={(slug) => { if (slug && !selected.includes(slug)) onChange([...selected, slug]) }} label={isCity ? 'ערים שבהן מתקיימים שיעורים' : 'מקצועות ההוראה'} placeholder={isCity ? 'חיפוש עיר נוספת' : 'חיפוש מקצוע נוסף'} {...validation} /></fieldset>
}