import { ChevronLeft, ChevronRight } from 'lucide-react'

export function SearchPagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  if (pageCount <= 1) return null
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index)
  return <nav className="search-pagination" aria-label="עמודי תוצאות"><button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="העמוד הקודם"><ChevronRight /></button>{pages.map((item) => <button type="button" key={item} className={item === page ? 'is-current' : ''} aria-current={item === page ? 'page' : undefined} onClick={() => onPage(item)}>{item}</button>)}<button type="button" disabled={page === pageCount} onClick={() => onPage(page + 1)} aria-label="העמוד הבא"><ChevronLeft /></button></nav>
}