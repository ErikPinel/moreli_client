import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, CheckCircle2, Eye, Mail, MessageCircle, Phone, ShieldCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/api/api-error'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { accessKey } from '@/features/account/useEngagementData'
import type { InquiryDto } from '@/types/api'

type Action = 'accept' | 'decline' | 'confirm_completed' | 'cancel' | 'report_no_show'
const lessonLabels = { needs_scheduling: 'נדרש תיאום מועד', awaiting: 'ממתין לקיום השיעור', completed: 'שני הצדדים אישרו שהתקיים', cancelled: 'השיעור בוטל', no_show_reported: 'דווחה אי-הגעה · נדרש בירור' }

export function InquiryDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const [note, setNote] = useState('')
  const [contactsOpen, setContactsOpen] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const teacherSide = profile?.role === 'teacher'
  const query = useQuery({ queryKey: ['account', 'inquiry', id], queryFn: () => apiRequest<InquiryDto>(endpoints.inquiry(id)), enabled: Boolean(id), refetchInterval: 30000 })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['account'] }); void queryClient.invalidateQueries({ queryKey: ['teachers', 'calendar'] }); void queryClient.invalidateQueries({ queryKey: accessKey }) }
  const mutation = useMutation({
    mutationFn: (selected: Action) => selected === 'accept' || selected === 'decline'
      ? apiRequest(endpoints.respondInquiry(id), { method: 'PATCH', body: { status: selected === 'accept' ? 'accepted' : 'declined' } })
      : apiRequest(endpoints.lesson(id), { method: 'PATCH', body: { action: selected, note: note.trim() } }),
    onSuccess: (_, selected) => { refresh(); setAction(null); setNote(''); toast.success(selected === 'accept' ? 'הפנייה התקבלה. פרטי הקשר זמינים כעת.' : 'העדכון נשמר ונשלחה הודעה לצד השני.') },
    onError: (error) => { if (error instanceof ApiError && error.status === 402) { setAction(null); setPaywall(true) } refresh() },
  })
  const viewed = useMutation({ mutationFn: () => apiRequest(endpoints.viewInquiry(id), { method: 'PATCH' }), onSuccess: refresh, onError: () => toast.error('לא ניתן לסמן כנקראה כרגע') })
  const inquiry = query.data
  const person = teacherSide ? inquiry?.student : inquiry?.teacher?.profile
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ') || (teacherSide ? 'התלמיד/ה' : 'המורה')
  const accepted = inquiry?.status === 'accepted'
  const completionTimeReached = Boolean(inquiry?.requested_end_at && Date.parse(inquiry.requested_end_at) <= query.dataUpdatedAt)
  const personallyConfirmed = teacherSide ? inquiry?.teacher_completed_at : inquiry?.student_completed_at
  function choose(next: Action) { mutation.reset(); setNote(''); setAction(next) }
  return <AccountShell title="פרטי הפנייה והשיעור" description="המועד שנבחר, פרטי הקשר והמשך הלימוד במקום אחד.">
    <Link className="text-link" to={teacherSide ? '/teacher/inquiries' : '/student/inquiries'}>חזרה לכל הפניות</Link>
    {query.isPending ? <WorkspaceState>טוען את הפנייה...</WorkspaceState> : null}
    {query.isError ? <WorkspaceState tone="error"><p>הפנייה אינה זמינה או שאין הרשאה לצפות בה.</p><Button variant="outline" onClick={() => void query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {inquiry ? <div className="inquiry-detail"><header><span className={`status-pill status-pill--${inquiry.status}`}>{({ sent: 'ממתינה למענה', viewed: 'נקראה וממתינה למענה', accepted: 'הפנייה התקבלה', declined: 'הפנייה נדחתה', expired: 'פג תוקף הפנייה' })[inquiry.status]}</span><h2>{name}</h2>{inquiry.requested_start_at ? <p className="inquiry-detail__date"><CalendarDays aria-hidden="true" />{formatLessonDate(inquiry.requested_start_at)} · {inquiry.lesson_mode === 'in_person' ? 'פרונטלי' : 'אונליין'} · שעון ישראל</p> : null}</header><section><h3>מה רוצים ללמוד</h3><p className="whitespace-pre-wrap break-words">{inquiry.message}</p></section>
      {teacherSide && ['sent', 'viewed'].includes(inquiry.status) ? <section><h3>מענה לפנייה</h3><p>קבלת תלמיד חדש אחד ללא עלות. לאחר מימוש ההטבה נדרשת גישה חודשית מאושרת ב־60 ש״ח. קשרים קיימים נשארים זמינים.</p><div className="review-actions"><Button disabled={mutation.isPending} onClick={() => choose('accept')}><Check />קבלת התלמיד/ה</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => choose('decline')}><XCircle />דחייה</Button>{inquiry.status === 'sent' ? <Button variant="ghost" disabled={viewed.isPending} onClick={() => viewed.mutate()}>סימון כנקראה</Button> : null}<Link to="/teacher/access">מצב הגישה והתשלום</Link></div></section> : null}
      <section><h3><ShieldCheck aria-hidden="true" />פרטי קשר</h3>{accepted ? <><p>פרטי הקשר זמינים למשתתפים בפנייה שאושרה, גם אם תקופת הגישה של המורה תסתיים.</p><Button variant="outline" onClick={() => setContactsOpen(!contactsOpen)}><Eye />{contactsOpen ? 'הסתרת פרטי הקשר' : 'הצגת שם, טלפון ואימייל'}</Button>{contactsOpen ? <div className="inquiry-contact"><strong>{name}</strong>{person?.phone ? <a href={`tel:${person.phone}`}><Phone aria-hidden="true" /><span dir="ltr">{person.phone}</span></a> : null}{person?.contact_email ? <a href={`mailto:${person.contact_email}`}><Mail aria-hidden="true" /><span dir="ltr">{person.contact_email}</span></a> : null}{!person?.phone && !person?.contact_email ? <p>פרטי הקשר אינם מלאים. פנו לתמיכה.</p> : null}</div> : null}</> : <p>הטלפון והאימייל יופיעו רק לאחר שהמורה יקבל את הפנייה.</p>}</section>
      {accepted ? <section><h3>מצב השיעור</h3><p className="lesson-status"><CalendarDays aria-hidden="true" />{inquiry.lesson_status ? lessonLabels[inquiry.lesson_status] : 'ממתין לעדכון'}</p>{inquiry.lesson_status === 'awaiting' ? <><p>{completionTimeReached ? 'לאחר השיעור, כל אחד מהמשתתפים מאשר בנפרד שהוא התקיים. הזמן שחלף אינו אישור נוכחות.' : 'השיעור ממתין למועד שנבחר. אישור שהתקיים יתאפשר רק לאחר שעת הסיום.'}</p>{personallyConfirmed ? <p><CheckCircle2 aria-hidden="true" />אישרתם שהשיעור התקיים. ממתינים לאישור הצד השני.</p> : null}<div className="review-actions"><Button disabled={!completionTimeReached || Boolean(personallyConfirmed) || mutation.isPending} onClick={() => choose('confirm_completed')}><CheckCircle2 />אישור שהשיעור התקיים</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => choose('cancel')}><XCircle />ביטול שיעור</Button>{completionTimeReached ? <Button variant="ghost" disabled={mutation.isPending} onClick={() => choose('report_no_show')}>דיווח על אי-הגעה</Button> : null}</div></> : null}{inquiry.lesson_note ? <p className="whitespace-pre-wrap break-words">{inquiry.lesson_note}</p> : null}{inquiry.lesson_status === 'completed' && !teacherSide ? <Link className="button-link" to="/student/reviews">כתיבת ביקורת על השיעור</Link> : null}</section> : null}
      <Link className="text-link" to={`/support?category=support&inquiry=${encodeURIComponent(id)}`}><MessageCircle aria-hidden="true" />עזרה או בירור בקשר לפנייה</Link>
    </div> : null}
    <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !mutation.isPending) setAction(null) }}><DialogContent dir="rtl" showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>{action === 'accept' ? 'קבלת התלמיד/ה' : action === 'decline' ? 'דחיית הפנייה' : action === 'cancel' ? 'ביטול השיעור' : action === 'report_no_show' ? 'דיווח על אי-הגעה' : 'אישור שהשיעור התקיים'}</DialogTitle><DialogDescription>{action === 'accept' ? 'פרטי הקשר ייחשפו לשני המשתתפים. המועד שנבחר יופיע כממתין לקיום השיעור. קבלת תלמיד חדש נוסף לאחר ההטבה דורשת גישה חודשית מאושרת.' : action === 'decline' ? 'התלמיד יקבל עדכון שהפנייה לא התקבלה. לא ייחשפו פרטי קשר.' : action === 'confirm_completed' ? 'אשרו רק אם השיעור אכן התקיים. נדרש אישור נפרד של הצד השני לפני פרסום ביקורת חדשה.' : 'הצד השני יקבל עדכון. ביטול שיעור אינו מבטל תשלום גישה למורהלי ואינו קובע זכאות להחזר על שיעור; לבירור פנו לתמיכה.'}</DialogDescription></DialogHeader>{action === 'cancel' || action === 'report_no_show' ? <label><span>סיבה · ללא פרטים רגישים</span><Textarea minLength={5} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} disabled={mutation.isPending} /></label> : null}{mutation.isError ? <p role="alert" className="form-error">העדכון לא הושלם. בדקו את המצב המעודכן לפני ניסיון נוסף.</p> : null}<DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}>חזרה</Button><Button disabled={mutation.isPending || ((action === 'cancel' || action === 'report_no_show') && note.trim().length < 5)} onClick={() => { if (action) mutation.mutate(action) }}>{mutation.isPending ? 'מעדכן...' : 'אישור ושליחת עדכון'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={paywall} onOpenChange={setPaywall}><DialogContent dir="rtl"><DialogHeader><DialogTitle>להמשך קבלת תלמידים חדשים</DialogTitle><DialogDescription>קבלת התלמיד החדש הראשונה ללא עלות כבר נוצלה. לקבלת תלמיד חדש נוסף נדרשת גישה חודשית מאושרת ב־60 ש״ח, בתשלום ידני ב־Bit. פרטי תלמידים שכבר אושרו נשארים זמינים. אין חידוש אוטומטי; סליקת כרטיס עדיין בפיתוח.</DialogDescription></DialogHeader><Button asChild><Link to="/teacher/access">פרטי התשלום ושליחת אסמכתא</Link></Button><Button variant="outline" onClick={() => setPaywall(false)}>חזרה לפנייה ללא אישור</Button></DialogContent></Dialog>
  </AccountShell>
}

function formatLessonDate(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(value)) }