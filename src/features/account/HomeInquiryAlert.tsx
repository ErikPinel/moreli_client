import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bell, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { InquiryDto, PaginatedDto } from '@/types/api'

export function HomeInquiryAlert() {
  const { profile } = useAuth()
  return profile?.role === 'teacher' ? <PendingTeacherAlert ownerId={profile.id} /> : null
}

function PendingTeacherAlert({ ownerId }: { ownerId: string }) {
  const storageKey = `moreli-pending-popup:${ownerId}`
  const [dismissed, setDismissed] = useState(() => { try { return sessionStorage.getItem(storageKey) ?? '' } catch { return '' } })
  const pending = useQuery({ queryKey: ['account', 'pending-inquiries', 'home'], queryFn: () => apiRequest<PaginatedDto<InquiryDto>>(`${endpoints.inquiries}?side=teacher&status=sent&page=1&limit=5`), staleTime: 15000, refetchInterval: 30000 })
  const first = pending.data?.items.find((inquiry) => !inquiry.requested_end_at || Date.parse(inquiry.requested_end_at) > pending.dataUpdatedAt)
  if (!first) return null
  const dismiss = () => { setDismissed(first.id); try { sessionStorage.setItem(storageKey, first.id) } catch { return } }
  const target = `/teacher/inquiries/${first.id}`
  return <><aside className="homepage-inquiry-alert" aria-label="פניות חדשות למורה"><div className="page-shell"><Bell aria-hidden="true" /><p>יש פנייה חדשה מתלמיד/ה שממתינה למענה שלכם.</p><Link to={target}>לפרטי הפנייה<ArrowLeft aria-hidden="true" /></Link></div></aside><Dialog open={dismissed !== first.id} onOpenChange={(open) => { if (!open) dismiss() }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>תלמיד/ה חדש/ה פנה/תה אליכם</DialogTitle><DialogDescription>פרטי הבקשה והמועד שנבחר מחכים באזור הפניות. פרטי הקשר ייחשפו לאחר קבלת הפנייה בהתאם למצב הגישה שלכם.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">קבלת תלמיד חדש אחד ללא עלות, ולאחר מכן גישה חודשית מאושרת ב־60 ש״ח. אין חיוב אוטומטי.</p><Button asChild><Link to={target} onClick={dismiss}><MessageCircle />צפייה בפנייה ובאפשרויות</Link></Button><Button variant="outline" onClick={dismiss}>אבדוק מאוחר יותר</Button></DialogContent></Dialog></>
}