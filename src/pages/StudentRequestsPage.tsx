import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Pencil, Plus, Search, Send, XCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { DateTime } from 'luxon'
import { lessonStart } from '@/lib/lesson-time'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys, useStudentRequests } from '@/features/account/useAccountData'
import { useCities, useLevels, useSubjects } from '@/features/search/hooks/useTaxonomies'
import { CatalogCombobox } from '@/features/search/components/CatalogCombobox'
import { TeacherCard } from '@/features/teachers/components/TeacherCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { RankedTeacherDto, StudentRequestDto } from '@/types/api'

type RequestPayload = {
  subjectSlug: string
  levelId?: number
  citySlug?: string
  onlineOk: boolean
  inPersonOk: boolean
  budgetMin?: number
  budgetMax?: number
  desiredAt?: string
  goal: string
  notes?: string
}

export function StudentRequestsPage() {
  const queryClient = useQueryClient()
  const requestsQuery = useStudentRequests()
  const subjectsQuery = useSubjects()
  const levelsQuery = useLevels()
  const citiesQuery = useCities()
  const [formRequest, setFormRequest] = useState<StudentRequestDto | 'new' | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)

  const matchesQuery = useQuery({
    queryKey: ['account', 'matches', selectedRequest],
    queryFn: () => apiRequest<RankedTeacherDto[]>(endpoints.requestMatches(selectedRequest!)),
    enabled: Boolean(selectedRequest),
  })
  const closeRequest = useMutation({
    mutationFn: (id: string) => apiRequest<StudentRequestDto>(endpoints.closeRequest(id), { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.requests })
      toast.success('הבקשה נסגרה')
    },
    onError: () => toast.error('לא הצלחנו לסגור את הבקשה'),
  })
  const runMatches = useMutation({
    mutationFn: (id: string) => apiRequest<RankedTeacherDto[]>(endpoints.requestMatches(id), { method: 'POST' }),
    onSuccess: (matches, id) => {
      setSelectedRequest(id)
      queryClient.setQueryData(['account', 'matches', id], matches)
      void queryClient.invalidateQueries({ queryKey: accountKeys.requests })
      toast.success(matches.length ? `מצאנו ${matches.length} מורים מתאימים` : 'לא נמצאו התאמות כרגע')
    },
    onError: () => toast.error('לא הצלחנו לחשב התאמות'),
  })

  const subjectName = (id: number) => subjectsQuery.data?.find((item) => item.id === id)?.name_he ?? 'תחום לימוד'
  const levelName = (id: number | null) => levelsQuery.data?.find((item) => item.id === id)?.name_he
  const cityName = (id: number | null) => citiesQuery.data?.find((item) => item.id === id)?.name_he

  return (
    <AccountShell
      title="בקשות והתאמות"
      description="ספרו מה תרצו ללמוד וקבלו התאמות מדורגות למורים רלוונטיים."
      actions={<Button onClick={() => setFormRequest((value) => value ? null : 'new')}><Plus />בקשה חדשה</Button>}
    >
      {formRequest ? <RequestForm key={formRequest === 'new' ? 'new' : formRequest.id} initial={formRequest === 'new' ? undefined : formRequest} onCancel={() => setFormRequest(null)} onDone={(request) => { setFormRequest(null); void queryClient.invalidateQueries({ queryKey: accountKeys.requests }); runMatches.mutate(request.id) }} /> : null}
      {requestsQuery.isPending ? <WorkspaceState>טוען את הבקשות שלך...</WorkspaceState> : null}
      {requestsQuery.isError ? <WorkspaceState tone="error">לא הצלחנו לטעון בקשות. <button onClick={() => void requestsQuery.refetch()}>נסו שוב</button></WorkspaceState> : null}
      {requestsQuery.data?.items.length === 0 && !formRequest ? <WorkspaceState><Search /><h2>עוד אין בקשות לימוד</h2><p>צרו בקשה ראשונה ונמצא עבורה עד חמישה מורים מתאימים.</p></WorkspaceState> : null}
      <div className="request-list">
        {requestsQuery.data?.items.map((request) => (
          <article className="request-item" key={request.id}>
            <div className="request-item__top">
              <div><span className={`status-pill status-pill--${request.status}`}>{requestStatus(request.status)}</span><h2>{subjectName(request.subject_id)}</h2></div>
              <time>{formatDate(request.created_at)}</time>
            </div>
            <p>{request.goal}</p>
            <div className="request-item__meta">
              {levelName(request.level_id) ? <span>{levelName(request.level_id)}</span> : null}
              {cityName(request.city_id) ? <span>{cityName(request.city_id)}</span> : null}
              <span>{[request.online_ok ? 'אונליין' : null, request.in_person_ok ? 'פרונטלי' : null].filter(Boolean).join(' + ')}</span>
              {request.budget_max ? <span>עד ₪{request.budget_max}</span> : null}
            </div>
            <div className="request-item__actions">
              {request.status !== 'closed' ? <Button onClick={() => runMatches.mutate(request.id)} disabled={runMatches.isPending}><Search />מציאת התאמות</Button> : null}
              <Button variant="outline" onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}>צפייה בהתאמות<ArrowLeft /></Button>
              {request.status === 'open' ? <Button variant="outline" onClick={() => setFormRequest(request)}><Pencil />עריכת בקשה</Button> : null}
              {request.status !== 'closed' ? <Button variant="ghost" onClick={() => closeRequest.mutate(request.id)}><XCircle />סגירת בקשה</Button> : null}
            </div>
            {selectedRequest === request.id ? (
              <div className="matches-panel">
                {matchesQuery.isPending ? <WorkspaceState>טוען התאמות...</WorkspaceState> : null}
                {matchesQuery.data?.length === 0 ? <p>אין התאמות שמורות. לחצו על ״מציאת התאמות״ לחישוב חדש.</p> : null}
                <div className="teacher-grid">
                  {matchesQuery.data?.map((match) => (
                    <div className="matched-teacher" key={match.teacher_id}>
                      <div className="matched-teacher__score"><strong>{Math.round(match.score)}%</strong><span>התאמה #{match.rank}</span></div>
                      <TeacherCard teacher={match.teacher} />
                      <Link className="button-link" to={`/teachers/${match.teacher.slug}?schedule=1&requestId=${request.id}`}><Send />בקשת שיעור</Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </AccountShell>
  )
}

function RequestForm({ initial, onDone, onCancel }: { initial?: StudentRequestDto; onDone: (request: StudentRequestDto) => void; onCancel: () => void }) {
  const subjects = useSubjects()
  const levels = useLevels()
  const cities = useCities()
  const [selectedSubject, setSelectedSubject] = useState<string>()
  const subjectSlug = selectedSubject ?? subjects.data?.find((item) => item.id === initial?.subject_id)?.slug ?? ''
  const [levelId, setLevelId] = useState(initial?.level_id ? String(initial.level_id) : '')
  const [selectedCity, setSelectedCity] = useState<string>()
  const citySlug = selectedCity ?? cities.data?.find((item) => item.id === initial?.city_id)?.slug ?? ''
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [budgetMin, setBudgetMin] = useState(initial?.budget_min ? String(initial.budget_min) : '')
  const [budgetMax, setBudgetMax] = useState(initial?.budget_max ? String(initial.budget_max) : '')
  const [desiredAt, setDesiredAt] = useState(initial?.desired_start_at ? DateTime.fromISO(initial.desired_start_at, { zone: 'Asia/Jerusalem' }).toFormat("yyyy-MM-dd'T'HH:mm") : '')
  const [error, setError] = useState('')
  const [onlineOk, setOnlineOk] = useState(initial?.online_ok ?? true)
  const [inPersonOk, setInPersonOk] = useState(initial?.in_person_ok ?? false)
  const mutation = useMutation({
    mutationFn: (payload: RequestPayload) => apiRequest<StudentRequestDto>(initial ? endpoints.request(initial.id) : endpoints.requests, { method: initial ? 'PUT' : 'POST', body: payload }),
    onSuccess: (request) => { toast.success(initial ? 'הבקשה עודכנה' : 'הבקשה נוצרה'); onDone(request) },
    onError: () => setError('לא הצלחנו לשמור את הבקשה. הפרטים נשארו כאן; בדקו את החיבור ונסו שוב.'),
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    setError('')
    if (inPersonOk && !citySlug) { setError('בחרו עיר לשיעורים פרונטליים.'); return }
    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) { setError('התקציב המקסימלי חייב להיות גדול או שווה למינימלי.'); return }
    let requestedTime: string | undefined
    if (desiredAt) {
      try {
        const [date, time] = desiredAt.split('T')
        const start = lessonStart(date, time)
        if (start <= new Date()) throw new Error('Past time')
        requestedTime = start.toISOString()
      } catch { setError('בחרו מועד עתידי תקין לפי שעון ישראל.'); return }
    }
    mutation.mutate({
      subjectSlug,
      ...(levelId ? { levelId: Number(levelId) } : {}),
      ...(citySlug && inPersonOk ? { citySlug } : {}),
      onlineOk, inPersonOk,
      ...(budgetMin ? { budgetMin: Number(budgetMin) } : {}),
      ...(budgetMax ? { budgetMax: Number(budgetMax) } : {}),
      ...(requestedTime ? { desiredAt: requestedTime } : {}),
      goal, ...(notes ? { notes } : {}),
    })
  }
  return (
    <form className="workspace-form" onSubmit={submit}>
      <div className="workspace-form__heading"><div>{initial ? <Pencil /> : <Plus />}<h2>{initial ? 'עריכת בקשת לימוד' : 'בקשת לימוד חדשה'}</h2></div><p>הפרטים ישמשו את מנגנון ההתאמה בלבד.</p></div>
      <div className="workspace-form__grid">
        <CatalogCombobox catalog="professions" value={subjectSlug} onChange={setSelectedSubject} label="תחום לימוד" placeholder="בחרו תחום" />
        <label><span>רמה</span><select value={levelId} onChange={(event) => setLevelId(event.target.value)}><option value="">כל רמה</option>{levels.data?.map((item) => <option key={item.id} value={item.id}>{item.name_he}</option>)}</select></label>
        <label><span>תקציב מינימלי לשעה</span><Input type="number" min="0" max="100000" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} /></label>
        <label><span>תקציב מקסימלי לשעה</span><Input type="number" min="0" max="100000" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} /></label>
        <label><span>מועד רצוי · שעון ישראל · לא חובה</span><Input type="datetime-local" value={desiredAt} onChange={(event) => setDesiredAt(event.target.value)} /></label>
        {inPersonOk ? <CatalogCombobox catalog="cities" value={citySlug} onChange={setSelectedCity} label="עיר" placeholder="בחרו עיר" /> : null}
      </div>
      <fieldset className="workspace-checks"><legend>אופן הלימוד</legend><label><input type="checkbox" checked={onlineOk} onChange={(event) => setOnlineOk(event.target.checked)} />אונליין</label><label><input type="checkbox" checked={inPersonOk} onChange={(event) => setInPersonOk(event.target.checked)} />פרונטלי</label></fieldset>
      <label><span>מה המטרה?</span><Textarea required minLength={3} maxLength={1000} rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="לדוגמה: הכנה לבגרות במתמטיקה 5 יחידות" /></label>
      <label><span>הערות למורה</span><Textarea maxLength={3000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {!onlineOk && !inPersonOk ? <p className="form-error">בחרו לפחות אופן לימוד אחד.</p> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="student-next-actions"><Button type="submit" disabled={mutation.isPending || !onlineOk && !inPersonOk || !subjectSlug}><CheckCircle2 />{mutation.isPending ? 'שומר...' : initial ? 'שמירה ועדכון התאמות' : 'שמירה ומציאת מורים'}</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>ביטול</Button></div>
    </form>
  )
}

function requestStatus(status: StudentRequestDto['status']) {
  return ({ open: 'פתוחה', matched: 'נמצאו התאמות', closed: 'סגורה', cancelled: 'בוטלה' })[status]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(value))
}