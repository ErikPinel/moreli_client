import { Link } from 'react-router-dom'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center" dir="rtl">
      <div>
        <p className="mb-3 text-sm font-bold text-primary">Morali</p>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <Link className="mt-6 inline-block font-bold text-primary hover:underline" to="/">
          חזרה לעמוד הבית
        </Link>
      </div>
    </main>
  )
}