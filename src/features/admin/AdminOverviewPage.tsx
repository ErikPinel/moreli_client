import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck, CreditCard, LifeBuoy, Star } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { apiRequest } from '@/api/api-client'
import { WorkspaceState } from '@/features/account/AccountShell'
import type { ManualAccessPaymentDto, PaginatedDto, ReviewDto, SupportTicketDto } from '@/types/api'
import type { ReviewTeacher } from '@/pages/AdminPage'

export function AdminOverviewPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const legacyPage = params.has('payment') ? 'payments' : params.has('teacher') ? 'onboarding' : params.has('ticket') ? 'support' : params.has('inquiry') ? 'activity' : ({ '#payments': 'payments', '#teachers': 'onboarding', '#support': 'support', '#activity': 'activity' } as Record<string, string>)[location.hash]
  if (legacyPage) return <Navigate replace to={`/admin/${legacyPage}${location.search}${location.hash}`} />
  return <Overview />
}

function Overview() {
  const payments = useQuery({ queryKey: ['admin', 'overview', 'payments'], queryFn: () => apiRequest<PaginatedDto<ManualAccessPaymentDto>>('/admin/access-payments?status=pending&page=1&limit=5'), refetchInterval: 30_000 })
  const teachers = useQuery({ queryKey: ['admin', 'overview', 'teachers'], queryFn: () => apiRequest<PaginatedDto<ReviewTeacher>>('/admin/teachers?status=pending&page=1&limit=5'), refetchInterval: 30_000 })
  const reviews = useQuery({ queryKey: ['admin', 'overview', 'reviews'], queryFn: () => apiRequest<PaginatedDto<ReviewDto>>('/admin/reviews?status=pending&page=1&limit=5'), refetchInterval: 30_000 })
  const support = useQuery({ queryKey: ['admin', 'overview', 'support'], queryFn: () => apiRequest<PaginatedDto<SupportTicketDto>>('/admin/support-tickets?page=1&limit=5&view=actionable'), refetchInterval: 30_000 })
  const queues = [
    { path: '/admin/payments', title: 'דיווחי תשלום ממתינים', icon: CreditCard, query: payments },
    { path: '/admin/onboarding', title: 'מורים ממתינים לבדיקה', icon: ClipboardCheck, query: teachers },
    { path: '/admin/reviews', title: 'ביקורות ממתינות', icon: Star, query: reviews },
    { path: '/admin/support', title: 'פניות שממתינות לצוות', icon: LifeBuoy, query: support },
  ]
  return <div className="admin-overview">
    <section className="admin-overview__queues" aria-labelledby="admin-queues-heading"><h2 id="admin-queues-heading">תורי עבודה</h2>
      {queues.map(({ path, title, icon: Icon, query }) => <Link to={path} key={path} className="admin-queue-link"><Icon aria-hidden="true" /><strong>{title}</strong><span className={query.data?.items.length ? 'admin-queue-count has-items' : 'admin-queue-count'}>{query.isPending ? '…' : query.isError ? 'לא זמין' : `${query.data?.items.length ?? 0}${query.data?.hasMore ? '+' : ''}`}</span><ArrowLeft aria-hidden="true" /></Link>)}
    </section>
    <section className="admin-overview__work" aria-labelledby="admin-work-heading"><header><h2 id="admin-work-heading">ממתינים להחלטה</h2><Link to="/admin/emails">מצב מסירת אימיילים<ArrowLeft aria-hidden="true" /></Link></header>
      {payments.isError || teachers.isError ? <WorkspaceState tone="error">חלק מהתורים לא נטענו. אפשר לרענן או לפתוח את העמוד המתאים.</WorkspaceState> : null}
      {payments.isPending || teachers.isPending ? <WorkspaceState>טוען משימות...</WorkspaceState> : null}
      {payments.data?.items.map(payment => <Link className="admin-work-row" key={payment.id} to={`/admin/payments?payment=${encodeURIComponent(payment.id)}#payments`}><CreditCard aria-hidden="true" /><div><strong>{payment.teacher?.profile.first_name} {payment.teacher?.profile.last_name}</strong><span>דיווח Bit · {payment.amount_ils} ₪</span></div><time dateTime={payment.created_at}>{new Date(payment.created_at).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}</time><ArrowLeft aria-hidden="true" /></Link>)}
      {teachers.data?.items.map(teacher => <Link className="admin-work-row" key={teacher.id} to={`/admin/onboarding?teacher=${encodeURIComponent(teacher.id)}#teachers`}><ClipboardCheck aria-hidden="true" /><div><strong>{teacher.profile.first_name} {teacher.profile.last_name}</strong><span>{teacher.headline}</span></div><span className="admin-state-label">בדיקת פרופיל</span><ArrowLeft aria-hidden="true" /></Link>)}
      {payments.isSuccess && teachers.isSuccess && !payments.data.items.length && !teachers.data.items.length ? <WorkspaceState>אין כרגע דיווחי תשלום או פרופילי מורים שממתינים להחלטה.</WorkspaceState> : null}
    </section>
  </div>
}