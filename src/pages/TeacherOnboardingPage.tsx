import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, Camera, Check, ChevronDown, Clock3, GraduationCap, MapPin, Save } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useRef, useState } from 'react'
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
import { accountKeys, useTeacherProfile } from '@/features/account/useAccountData'
import { useCities, useLevels, useSubjects } from '@/features/search/hooks/useTaxonomies'
import { CatalogCombobox } from '@/features/search/components/CatalogCombobox'
import { catalogs } from '@/data/catalogs'
import type { AvailabilitySlotDto, ProfileDto, SignedUrlDto, TeacherOnboardingDto } from '@/types/api'

type EditableSlot = Pick<AvailabilitySlotDto, 'day_of_week' | 'start_time' | 'end_time'>
type UploadUrl = { signedUrl: string; path: string; token: string }

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export function TeachClaimPage() {
  const { profile } = useAuth()
  if (profile?.role === 'teacher') return <Navigate replace to="/teacher/dashboard" />
  if (!profile || profile.role !== 'student') return <Navigate replace to="/" />
  return <TeacherOnboardingForm isNew teacher={{ profile, profile_status: 'draft', headline: '', bio: '', hourly_price: 0, years_experience: 0, teaches_online: true, teaches_in_person: false, subjects: [], levels: [], service_areas: [], availability: [], currency: 'ILS', slug: '', review_reason: null }} />
}

export function TeacherOnboardingPage() {
  const teacherQuery = useTeacherProfile()
  if (teacherQuery.isPending) return <AccountShell title="השלמת הפרופיל" description=""><WorkspaceState>טוען את פרופיל המורה...</WorkspaceState></AccountShell>
  if (teacherQuery.isError || !teacherQuery.data) return <AccountShell title="השלמת הפרופיל" description=""><WorkspaceState tone="error">לא הצלחנו לטעון את הפרופיל.</WorkspaceState></AccountShell>
  return <TeacherOnboardingForm teacher={teacherQuery.data} />
}

type FormTeacher = Pick<TeacherOnboardingDto, 'profile' | 'profile_status' | 'headline' | 'bio' | 'hourly_price' | 'years_experience' | 'teaches_online' | 'teaches_in_person' | 'subjects' | 'levels' | 'service_areas' | 'availability' | 'currency' | 'slug' | 'review_reason'>

function TeacherOnboardingForm({ teacher, isNew = false }: { teacher: FormTeacher; isNew?: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [avatarPath, setAvatarPath] = useState(teacher.profile.avatar_path)
  const [avatarPending, setAvatarPending] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const subjectsQuery = useSubjects()
  const levelsQuery = useLevels()
  const citiesQuery = useCities()
  const [firstName, setFirstName] = useState(teacher.profile.first_name)
  const [lastName, setLastName] = useState(teacher.profile.last_name)
  const [phone, setPhone] = useState(teacher.profile.phone ?? '')
  const [selectedCity, setSelectedCity] = useState<string>()
  const citySlug = selectedCity ?? citiesQuery.data?.find((item) => item.id === teacher.profile.city_id)?.slug ?? ''
  const [headline, setHeadline] = useState(teacher.headline)
  const [bio, setBio] = useState(teacher.bio)
  const [price, setPrice] = useState(String(teacher.hourly_price || ''))
  const [experience, setExperience] = useState(isNew ? '' : String(teacher.years_experience))
  const [online, setOnline] = useState(teacher.teaches_online)
  const [inPerson, setInPerson] = useState(teacher.teaches_in_person)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>()
  const subjectSlugs = selectedSubjects ?? teacher.subjects.flatMap((item) => {
    const subject = subjectsQuery.data?.find((subject) => subject.id === item.subject_id)
    return subject ? [subject.slug] : []
  })
  const [levelIds, setLevelIds] = useState(() => teacher.levels.map((item) => item.level_id))
  const [selectedAreas, setSelectedAreas] = useState<string[]>()
  const citySlugs = selectedAreas ?? teacher.service_areas.flatMap((item) => {
    const city = citiesQuery.data?.find((city) => city.id === item.city_id)
    return city ? [city.slug] : []
  })
  const [slots, setSlots] = useState<EditableSlot[]>(() => teacher.availability.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time: start_time.slice(0, 5), end_time: end_time.slice(0, 5) })))
  const [saveError, setSaveError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const catalogsReady = subjectsQuery.isSuccess && citiesQuery.isSuccess && levelsQuery.isSuccess
  const slotErrors = slots.flatMap((slot, index) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end_time) || slot.start_time >= slot.end_time) return [`חלון ${index + 1}: שעת הסיום חייבת להיות אחרי שעת ההתחלה`]
    if (slots.some((other, otherIndex) => otherIndex < index && other.day_of_week === slot.day_of_week && other.start_time < slot.end_time && slot.start_time < other.end_time)) return [`חלון ${index + 1}: קיימת חפיפה ביום ${days[slot.day_of_week]}`]
    return []
  })
  const stepMissing = [[
    !firstName.trim() && 'שם פרטי', !lastName.trim() && 'שם משפחה',
    phone.trim().length < 7 && 'טלפון תקין', !teacher.profile.contact_email && 'אימייל מאומת',
    !citySlug && 'עיר מגורים', !avatarPath && 'תמונת פרופיל', avatarPending && 'סיום העלאת התמונה',
  ], [
    !headline.trim() && 'כותרת מקצועית', !bio.trim() && 'אודות',
    (!Number.isInteger(Number(price)) || Number(price) < 1 || Number(price) > 100000) && 'מחיר לשעה בין 1 ל-100,000',
    (experience === '' || !Number.isInteger(Number(experience)) || Number(experience) < 0 || Number(experience) > 80) && 'שנות ניסיון בין 0 ל-80',
    !online && !inPerson && 'אופן לימוד',
  ], [
    !subjectSlugs.length && 'מקצוע הוראה', !levelIds.length && 'רמת לימוד',
    inPerson && !citySlugs.length && 'עיר לשיעורים פרונטליים',
  ], [!slots.length && 'לפחות חלון זמינות שבועי אחד', ...slotErrors]].map((items) => items.filter((item): item is string => Boolean(item)))
  const missing = [...stepMissing.flat(), ...(isNew && !acceptedTerms ? ['אישור תנאי השימוש ומעבר לחשבון מורה'] : [])]
  function showMissing(items: string[], step: number) {
    setSaveError(`יש להשלים או לתקן: ${items.join(', ')}.`)
    setActiveStep(step)
    alertRef.current?.focus()
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  function continueStep(step: number) {
    if (stepMissing[step].length) { showMissing(stepMissing[step], step); return }
    setSaveError('')
    setActiveStep(step + 1)
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
        await apiRequest(`${endpoints.currentTeacher}/onboarding`, { method: 'POST', body: { acceptTerms: acceptedTerms, firstName, lastName, phone, citySlug, avatarPath, headline, bio, hourlyPrice: Number(price), yearsExperience: Number(experience), teachesOnline: online, teachesInPerson: inPerson, subjectSlugs, levelIds, citySlugs, slots: slots.map((slot) => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })) } })
        return { submittedForReview: true }
      }
      if (teacher.profile_status === 'published' && inPerson && !teacher.teaches_in_person) {
        await apiRequest(endpoints.teacherServiceAreas, { method: 'PUT', body: { citySlugs } })
      }
      if (teacher.profile_status === 'published' && !online && teacher.teaches_online) {
        await apiRequest(endpoints.teacherAvailability, { method: 'PUT', body: { slots: slots.map((slot) => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })) } })
      }
      await apiRequest(endpoints.currentUser, { method: 'PATCH', body: { firstName, lastName, phone, ...(citySlug ? { citySlug } : {}) } })
      await apiRequest(endpoints.currentTeacher, { method: 'PATCH', body: { headline, bio, hourlyPrice: Number(price), currency: teacher.currency, yearsExperience: Number(experience), teachesOnline: online, teachesInPerson: inPerson } })
      const results = await Promise.allSettled([
        apiRequest(endpoints.teacherSubjects, { method: 'PUT', body: { subjects: subjectSlugs.map((subjectSlug) => ({ subjectSlug })) } }),
        apiRequest(endpoints.teacherLevels, { method: 'PUT', body: { levelIds } }),
        apiRequest(endpoints.teacherServiceAreas, { method: 'PUT', body: { citySlugs } }),
        apiRequest(endpoints.teacherAvailability, { method: 'PUT', body: { slots: slots.map((slot) => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })) } }),
      ])
      const failed = results.flatMap((result, index) => result.status === 'rejected' ? [['מקצועות', 'רמות לימוד', 'ערים', 'זמינות שבועית'][index]] : [])
      if (failed.length) throw new Error(`חלק מהפרטים נשמרו, אך לא הצלחנו לשמור: ${failed.join(', ')}. בדקו את הבחירות ואת חפיפות השעות ונסו שוב.`)
      if (intent === 'review') {
        try { await apiRequest(endpoints.submitTeacherReview, { method: 'POST' }) }
        catch { throw new Error('הטיוטה נשמרה, אך השליחה לבדיקה לא הושלמה. בדקו את פרטי החובה ונסו לשלוח שוב.') }
        return { submittedForReview: true }
      }
      return { submittedForReview: false }
    },
    onSuccess: async ({ submittedForReview }, intent) => {
      if (submittedForReview) {
        setSavedMessage('הפרופיל נשלח לבדיקה. הוא עדיין אינו מופיע בחיפוש; ההחלטה תופיע כאן ותישלח באימייל.')
        toast.success('הפרופיל נשמר ונשלח לבדיקה')
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
      const message = isNew ? 'השליחה לא אושרה. הפרטים נשארו כאן. בדקו את החיבור ונסו שוב; אם התשובה אבדה לאחר שמירה, ניסיון חוזר לא ייצור חשבון נוסף.' : error instanceof Error && /[\u0590-\u05ff]/.test(error.message) ? error.message : 'השמירה לא הושלמה. חלק מהפרטים עשויים להישמר; בדקו את החיבור ואת הנתונים ונסו שוב.'
      setSaveError(message)
      toast.error(message)
    },
    onSettled: refresh,
  })

  const toggle = (values: number[], value: number, setter: (next: number[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  const addSlot = () => setSlots((current) => [...current, { day_of_week: 0, start_time: '16:00', end_time: '18:00' }])
  const updateSlot = (index: number, field: keyof EditableSlot, value: string | number) => setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = isNew || submitter?.value === 'review' ? 'review' : teacher.profile_status === 'draft' ? 'draft' : 'save'
    if ((intent !== 'draft' && missing.length) || slotErrors.length) { showMissing(intent === 'draft' ? slotErrors : missing, Math.max(0, stepMissing.findIndex((items) => items.length > 0))); return }
    save.mutate(intent)
  }
  return <AccountShell title={teacher.profile_status === 'draft' ? 'השלמת פרופיל המורה' : 'פרטי ההוראה'} description="כל מה שתלמידים צריכים כדי להחליט אם לפנות אליכם." actions={teacher.profile_status === 'published' ? <span className="published-badge"><BadgeCheck />הפרופיל מפורסם</span> : teacher.profile_status === 'pending' ? <span className="published-badge is-pending"><Clock3 />ממתין לאישור</span> : null}>
    {isNew ? <p className="onboarding-account-notice">החשבון שלך נשאר חשבון תלמיד עד לשמירה ושליחה מוצלחת. לאחר השליחה הוא יהפוך לחשבון מורה, ולא יהיה ניתן לשלוח ממנו בקשות שיעור כתלמיד. הפרסום בחיפוש ימתין לאישור מנהל.</p> : null}
    <p className="onboarding-progress" role="status">{stepMissing.filter((items) => !items.length).length} מתוך 4 שלבים הושלמו</p>
    {teacher.profile_status === 'published' ? <Link className="button-link" to={`/teachers/${teacher.slug}`}>צפייה בפרופיל הציבורי</Link> : null}
    {teacher.profile_status === 'pending' ? <WorkspaceState><Clock3 /><h2>הפרופיל בבדיקה</h2><p>הפרופיל עדיין אינו מופיע בחיפוש. ההחלטה תופיע כאן ותישלח באימייל.</p></WorkspaceState> : null}
    {teacher.profile_status === 'suspended' ? <WorkspaceState tone="error"><h2>הפרופיל מושהה</h2><p>הפרופיל אינו מופיע בחיפוש. עדכון פרטים אינו מבטל את ההשהיה; נדרשת בדיקת מנהל.</p></WorkspaceState> : null}
    {!catalogsReady ? <WorkspaceState>{subjectsQuery.isError || citiesQuery.isError || levelsQuery.isError ? <><p>לא הצלחנו לטעון את אפשרויות הפרופיל.</p><Button type="button" onClick={() => { void subjectsQuery.refetch(); void citiesQuery.refetch(); void levelsQuery.refetch() }}>ניסיון נוסף</Button></> : 'טוען מקצועות, רמות וערים...'}</WorkspaceState> : null}
    {!isNew && teacher.profile_status === 'draft' && catalogsReady ? <div className="profile-readiness"><h2>{missing.length ? 'לפני שליחה לבדיקה' : 'הפרופיל מוכן לשליחה לבדיקה'}</h2>{missing.length ? <ul>{missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : null}
    {teacher.profile_status === 'draft' && teacher.review_reason ? <WorkspaceState tone="error"><h2>נדרשים תיקונים לפני פרסום</h2><p>{teacher.review_reason}</p></WorkspaceState> : null}
    <form className="onboarding-sections" onSubmit={submit} noValidate>
      <div ref={alertRef} tabIndex={-1} role={saveError ? 'alert' : undefined} className={saveError ? 'profile-save-error' : undefined}>{saveError}</div>
      <fieldset className="onboarding-fields" disabled={save.isPending || !catalogsReady}>
      <OnboardingStep index={0} title="זהות ופרטי קשר" open={activeStep === 0} missing={stepMissing[0]} onOpen={() => setActiveStep(0)} onContinue={() => continueStep(0)}>
        <AvatarUpload currentPath={avatarPath} onUploaded={setAvatarPath} onBusyChange={setAvatarPending} />
        <div className="workspace-form__grid"><label><span>שם פרטי</span><Input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label><span>שם משפחה</span><Input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label><span>אימייל מאומת</span><Input type="email" dir="ltr" value={teacher.profile.contact_email ?? ''} disabled /></label><label><span>טלפון</span><Input required type="tel" dir="ltr" inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><CatalogCombobox catalog="cities" value={citySlug} onChange={setSelectedCity} label="עיר מגורים" placeholder="בחרו עיר" /></div>
      </OnboardingStep>
      <OnboardingStep index={1} title="הצגה מקצועית" open={activeStep === 1} missing={stepMissing[1]} onOpen={() => setActiveStep(1)} onContinue={() => continueStep(1)}>
        <label><span>כותרת מקצועית</span><Input required maxLength={200} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label><label><span>אודות</span><Textarea required maxLength={5000} rows={7} value={bio} onChange={(event) => setBio(event.target.value)} /></label><div className="workspace-form__grid"><label><span>מחיר לשעה בשקלים</span><Input required type="number" min="1" max="100000" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label><span>שנות ניסיון (0 למורים בתחילת הדרך)</span><Input required type="number" min="0" max="80" value={experience} onChange={(event) => setExperience(event.target.value)} /></label></div><fieldset className="workspace-checks"><legend>אופן הלימוד</legend><label><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} />אונליין</label><label><input type="checkbox" checked={inPerson} onChange={(event) => setInPerson(event.target.checked)} />פרונטלי</label></fieldset>
      </OnboardingStep>
      <OnboardingStep index={2} title="מקצועות ורמות" open={activeStep === 2} missing={stepMissing[2]} onOpen={() => setActiveStep(2)} onContinue={() => continueStep(2)}>
        <CatalogMultiSelect catalog="professions" selected={subjectSlugs} onChange={setSelectedSubjects} /><ChoiceGrid title="רמות לימוד" items={levelsQuery.data ?? []} selected={levelIds} onToggle={(id) => toggle(levelIds, id, setLevelIds)} />{inPerson ? <CatalogMultiSelect catalog="cities" selected={citySlugs} onChange={setSelectedAreas} /> : null}
      </OnboardingStep>
      <OnboardingStep index={3} title="זמינות שבועית" open={activeStep === 3} missing={stepMissing[3]} onOpen={() => setActiveStep(3)}>
        <p>שעות הפעילות לפי שעון ישראל · תצוגת 24 שעות</p>
        <div className="onboarding-schedule">{slots.map((slot, index) => <div className="onboarding-slot" key={index}><label><span>יום בשבוע</span><select value={slot.day_of_week} onChange={(event) => updateSlot(index, 'day_of_week', Number(event.target.value))}>{days.map((day, dayIndex) => <option value={dayIndex} key={day}>{day}</option>)}</select></label><TimeSelect label="שעת התחלה" value={slot.start_time} onChange={(value) => updateSlot(index, 'start_time', value)} /><TimeSelect label="שעת סיום" value={slot.end_time} onChange={(value) => updateSlot(index, 'end_time', value)} /><Button type="button" variant="ghost" aria-label={`הסרת חלון ${index + 1}`} onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}>הסרה</Button></div>)}</div><Button type="button" variant="outline" onClick={addSlot}><CalendarDays />הוספת חלון זמן</Button>
      </OnboardingStep>
      </fieldset>
      {isNew ? <label className="onboarding-consent"><input type="checkbox" checked={acceptedTerms} disabled={save.isPending} onChange={(event) => setAcceptedTerms(event.target.checked)} />אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות ומאשר/ת מעבר מחשבון תלמיד לחשבון מורה לאחר שמירה ושליחה מוצלחת.</label> : null}
      {savedMessage ? <p role="status" className="profile-save-status">{savedMessage}</p> : null}
      <div className="onboarding-save">{!isNew ? <Button type="submit" disabled={save.isPending || avatarPending || !catalogsReady} variant={teacher.profile_status === 'draft' ? 'outline' : 'default'}><Save />{save.isPending ? 'שומר...' : teacher.profile_status === 'draft' ? 'שמירת טיוטה' : 'שמירת שינויים'}</Button> : null}{teacher.profile_status === 'draft' ? <Button type="submit" value="review" disabled={save.isPending || avatarPending || !catalogsReady}><BadgeCheck />{save.isPending ? 'שומר ושולח...' : 'שמירה ושליחה לבדיקה'}</Button> : null}{isNew ? <Link to="/student/profile">ביטול וחזרה לחשבון התלמיד</Link> : null}</div>
    </form>
  </AccountShell>
}

function ChoiceGrid({ title, icon, items, selected, onToggle }: { title: string; icon?: React.ReactNode; items: Array<{ id: number; name_he: string }>; selected: number[]; onToggle: (id: number) => void }) {
  return <fieldset className="choice-grid"><legend>{icon}{title}</legend><div>{items.map((item) => <label className={selected.includes(item.id) ? 'is-selected' : ''} key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span>{item.name_he}</span><Check /></label>)}</div></fieldset>
}

function OnboardingStep({ index, title, open, missing, onOpen, onContinue, children }: { index: number; title: string; open: boolean; missing: string[]; onOpen: () => void; onContinue?: () => void; children: ReactNode }) {
  return <details className="onboarding-step" open={open}><summary onClick={(event) => { event.preventDefault(); onOpen() }}><span className="onboarding-step__number">{missing.length ? index + 1 : <Check aria-hidden="true" />}</span><span><strong>{title}</strong><small>{missing.length === 1 ? 'נותר פרט אחד להשלמה' : missing.length ? `נותרו ${missing.length} פרטים להשלמה` : 'הושלם'}</small></span><ChevronDown aria-hidden="true" /></summary><div className="onboarding-step__body">{children}{onContinue ? <Button type="button" className="onboarding-next" onClick={onContinue}>המשך לשלב הבא</Button> : null}</div></details>
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

function CatalogMultiSelect({ catalog, selected, onChange }: { catalog: keyof typeof catalogs; selected: string[]; onChange: (slugs: string[]) => void }) {
  const isCity = catalog === 'cities'
  const title = isCity ? 'אזורי שירות' : 'מקצועות'
  return <fieldset className="subject-multi-select"><legend>{isCity ? <MapPin /> : <GraduationCap />}{title}</legend><CatalogCombobox catalog={catalog} value="" excluded={selected} selected={selected} onRemove={(removed) => onChange(selected.filter((slug) => slug !== removed))} onChange={(slug) => { if (slug && !selected.includes(slug)) onChange([...selected, slug]) }} label={isCity ? 'ערים שבהן מתקיימים שיעורים' : 'מקצועות ההוראה'} placeholder={isCity ? 'חיפוש עיר נוספת' : 'חיפוש מקצוע נוסף'} /></fieldset>
}