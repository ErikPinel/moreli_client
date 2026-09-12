import { useMutation, useQuery } from '@tanstack/react-query'
import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { WorkspaceState } from '@/features/account/AccountShell'

type ApprovalPreview = {
  teacherId: string
  name: string
  headline: string
  profileStatus: string
  verificationStatus: string
  expiresAt: string
}

export function TeacherApprovalPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const preview = useQuery({
    queryKey: ['teacher-approval', token],
    queryFn: () => apiRequest<ApprovalPreview>(endpoints.teacherApprovalPreview(token)),
    enabled: Boolean(token),
    retry: false,
  })
  const approval = useMutation({
    mutationFn: () => apiRequest<{ approved: boolean }>(endpoints.approveTeacher, { method: 'POST', body: { token } }),
  })

  return <div className="approval-page" dir="rtl"><Header /><main className="page-shell approval-page__main">
    {token && preview.isPending ? <WorkspaceState>בודקים את קישור האישור...</WorkspaceState> : null}
    {preview.isError || !token ? <WorkspaceState tone="error">קישור האישור אינו תקין או שפג תוקפו.</WorkspaceState> : null}
    {preview.data && !approval.isSuccess ? <section><ShieldCheck /><p>בדיקת פרופיל מורה</p><h1>{preview.data.name}</h1><h2>{preview.data.headline}</h2><dl><div><dt>סטטוס פרופיל</dt><dd>{preview.data.profileStatus}</dd></div><div><dt>סטטוס אימות</dt><dd>{preview.data.verificationStatus}</dd></div></dl>{preview.data.profileStatus === 'pending' ? <Button onClick={() => approval.mutate()} disabled={approval.isPending}><BadgeCheck />{approval.isPending ? 'מאשר...' : 'אישור ופרסום המורה'}</Button> : <p>הפרופיל אינו ממתין לאישור.</p>}{approval.isError ? <p role="alert">האישור נכשל. ייתכן שהקישור כבר נוצל או שהפרופיל השתנה.</p> : null}</section> : null}
    {approval.isSuccess ? <section><BadgeCheck /><h1>המורה אושר בהצלחה</h1><p>הפרופיל פורסם והתלמידים יכולים למצוא אותו. הודעת אישור נוספה לתור האימיילים.</p></section> : null}
  </main><Footer /></div>
}