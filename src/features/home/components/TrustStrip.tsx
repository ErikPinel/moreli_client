import { BookOpen, MessagesSquare, Monitor } from 'lucide-react'

const trustItems = [
  { icon: BookOpen, label: 'לימודים בכל שלב בחיים', className: 'trust-item--shield' },
  { icon: Monitor, label: 'אונליין או פרונטלי', className: 'trust-item--rating' },
  { icon: MessagesSquare, label: 'תיאום ישיר עם המורה', className: 'trust-item--users' },
] as const

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="היתרונות של מורהלי">
      <div className="page-shell grid grid-cols-3">
        {trustItems.map(({ icon: Icon, label, className }) => (
          <div className={`trust-item ${className}`} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}