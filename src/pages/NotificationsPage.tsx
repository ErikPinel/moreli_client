import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys, useNotifications } from '@/features/account/useAccountData'
import type { NotificationDto } from '@/types/api'

export function NotificationsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const notificationsQuery = useNotifications()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.notifications })
    void queryClient.invalidateQueries({ queryKey: accountKeys.unreadNotifications })
  }
  const markRead = useMutation({ mutationFn: (id: string) => apiRequest<NotificationDto>(endpoints.readNotification(id), { method: 'PATCH' }), onSuccess: refresh, onError: () => toast.error('לא הצלחנו לעדכן את ההתראה') })
  const markAll = useMutation({ mutationFn: () => apiRequest(endpoints.readAllNotifications, { method: 'POST' }), onSuccess: () => { refresh(); toast.success('כל ההתראות סומנו כנקראו') }, onError: () => toast.error('לא הצלחנו לעדכן את ההתראות') })
  const unread = notificationsQuery.data?.items.some((item) => !item.read_at)
  return <AccountShell title="התראות" description="עדכונים על פניות, התאמות ופעילות בחשבון." actions={unread ? <Button variant="outline" onClick={() => markAll.mutate()}><CheckCheck />סימון הכל כנקרא</Button> : null}>
    {notificationsQuery.isPending ? <WorkspaceState>טוען התראות...</WorkspaceState> : null}
    {notificationsQuery.isError ? <WorkspaceState tone="error">לא הצלחנו לטעון התראות.</WorkspaceState> : null}
    {notificationsQuery.data?.items.length === 0 ? <WorkspaceState><Bell /><h2>אין התראות חדשות</h2><p>עדכונים חשובים מהחשבון יופיעו כאן.</p></WorkspaceState> : null}
    <div className="notification-list">{notificationsQuery.data?.items.map((notification) => <article className={`notification-entry ${notification.read_at ? '' : 'is-unread'}`} key={notification.id}><Bell aria-hidden="true" /><div><strong>{notification.title}</strong><p>{notification.body}</p><time>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.created_at))}</time><div className="review-actions">{notificationTarget(notification, profile?.role === 'teacher') ? <Link className="text-link" to={notificationTarget(notification, profile?.role === 'teacher')!}>לפרטים ולפעולות</Link> : null}{!notification.read_at ? <Button variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}>סימון כנקראה</Button> : null}</div></div>{!notification.read_at ? <i aria-label="לא נקראה" /> : null}</article>)}</div>
  </AccountShell>
}

function notificationTarget(notification: NotificationDto, teacher: boolean) {
  if (!notification.entity_id) return null
  if (notification.entity_type === 'inquiry') return `/${teacher ? 'teacher' : 'student'}/inquiries/${notification.entity_id}`
  if (notification.entity_type === 'payment') return `/teacher/access?payment=${encodeURIComponent(notification.entity_id)}`
  if (notification.entity_type === 'support') return `/support/${notification.entity_id}`
  if (notification.entity_type === 'review') return teacher ? '/teacher/reviews' : '/student/reviews'
  if (notification.entity_type === 'teacher') return '/teacher/onboarding'
  return null
}