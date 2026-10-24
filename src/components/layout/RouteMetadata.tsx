import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { publicPages, site } from '@/lib/site'
import { setPageMetadata } from '@/lib/page-metadata'

export function RouteMetadata() {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    const page = publicPages.find(page => page.path === pathname)
    const isTeacher = /^\/teachers\/[^/]+$/.test(pathname)
    const isDraft = pathname === '/terms' || pathname === '/privacy'
    const title = page?.title ?? (isTeacher ? 'פרופיל מורה פרטי | מורהלי' : isDraft ? `${pathname === '/terms' ? 'תנאי שימוש' : 'מדיניות פרטיות'} (טיוטה) | מורהלי` : 'מורהלי')
    const description = page?.description ?? (isTeacher ? 'פרופיל מורה פרטי במורהלי. קראו על תחומי הלימוד ושלחו בקשה לשיעור לאחר כניסה לחשבון.' : 'מורהלי — חיפוש מורים פרטיים ותמיכה למשתמשי האתר.')
    const canonical = `${site.url}${pathname}`
    setPageMetadata(title, description, canonical)
    const previous = document.head.querySelector('meta[data-route-robots]')
    previous?.remove()
    // Legal drafts already render their own noindex metadata.
    if (!page && !isTeacher && !isDraft) {
      const robots = document.createElement('meta')
      robots.name = 'robots'
      robots.content = 'noindex'
      robots.dataset.routeRobots = ''
      document.head.append(robots)
    }
  }, [pathname])

  return null
}
