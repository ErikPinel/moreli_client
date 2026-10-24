import { expect, test } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import type { PublicTeacherDto } from '../src/types/api'

test('search discovery files have valid formats instead of SPA HTML', async ({ page, request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(robots.headers()['content-type']).toContain('text/plain')
  expect(await robots.text()).toContain('Sitemap: https://morehli.co.il/sitemap.xml')
  const markdown = await request.get('/llms.txt')
  expect(markdown.headers()['content-type']).toContain('text/plain')
  expect(await markdown.text()).toMatch(/^# מורהלי/)
  expect(await markdown.text()).toContain('## עברית — על מורהלי')
  expect(await markdown.text()).toContain('## English — about Morehli')
  const ai = await request.get('/ai.txt')
  expect(ai.status()).toBe(200)
  expect(ai.headers()['content-type']).toContain('text/plain')
  expect(await ai.text()).toContain('morehlisrael@gmail.com')
  for (const [path, root] of [['/sitemap.xml', 'sitemapindex'], ['/sitemap-pages.xml', 'urlset']]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^(application|text)\/xml(?:;|$)/)
    const parsed = await page.evaluate(xml => {
      const document = new DOMParser().parseFromString(xml, 'application/xml')
      return { error: Boolean(document.querySelector('parsererror')), root: document.documentElement.localName, namespace: document.documentElement.namespaceURI }
    }, await response.text())
    expect(parsed).toEqual({ error: false, root, namespace: 'http://www.sitemaps.org/schemas/sitemap/0.9' })
  }
  const unknown = await request.get('/ai-catalog.json')
  expect(unknown.status()).toBe(404)
})

test('localized business information is accessible without JavaScript on narrow and wide screens', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    for (const variant of [
      { path: '/about.html', language: 'he', direction: 'rtl', heading: 'אודות מורהלי ויצירת קשר', faq: 'שאלות נפוצות', alternate: 'English' },
      { path: '/about-en.html', language: 'en', direction: 'ltr', heading: 'About Morehli and contact information', faq: 'Frequently asked questions', alternate: 'עברית' },
    ]) {
      await page.goto(variant.path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(variant.heading)
      await expect(page.getByRole('link', { name: /morehlisrael@gmail.com/ })).toHaveAttribute('href', 'mailto:morehlisrael@gmail.com')
      await expect(page.getByRole('link', { name: /0503939008/ })).toHaveAttribute('href', 'tel:+972503939008')
      await expect(page.getByRole('heading', { name: variant.faq, exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', variant.language)
      await expect(page.locator('html')).toHaveAttribute('dir', variant.direction)
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `https://morehli.co.il${variant.path}`)
      await expect(page.locator('head link[hreflang="he-IL"]')).toHaveAttribute('href', 'https://morehli.co.il/about.html')
      await expect(page.locator('head link[hreflang="en"]')).toHaveAttribute('href', 'https://morehli.co.il/about-en.html')
      await expect(page.getByRole('link', { name: variant.alternate, exact: true })).toBeVisible()
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
    }
    await page.getByRole('link', { name: 'עברית', exact: true }).click()
    await expect(page).toHaveURL(/\/about.html$/)
    await page.getByRole('link', { name: 'English', exact: true }).click()
    await expect(page).toHaveURL(/\/about-en.html$/)
    await page.goto('/')
    await expect(page.getByRole('link', { name: /זמין גם ללא JavaScript/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'morehlisrael@gmail.com', exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('route metadata, draft boundaries and visible support remain correct with an unavailable API', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.route(url => url.pathname.startsWith('/api/'), route => route.abort())
  await page.goto('/support?category=bug')
  await expect(page).toHaveTitle('עזרה ויצירת קשר | מורהלי')
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', 'https://morehli.co.il/support')
  await expect(page.getByRole('main').getByRole('link', { name: 'morehlisrael@gmail.com', exact: true })).toBeVisible()
  const footer = page.getByRole('contentinfo')
  await expect(footer.locator('a[href="tel:+972503939008"]')).toBeVisible()
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await footer.getByRole('link', { name: 'תנאי שימוש (טיוטה)', exact: true }).click()
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await footer.getByRole('link', { name: 'חיפוש מורים', exact: true }).click()
  await expect(page).toHaveTitle('חיפוש מורים פרטיים | מורהלי')
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', 'https://morehli.co.il/teachers')
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0)
  await page.goto('/does-not-exist')
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

test('published teacher metadata reflects the profile while missing profiles use noindex', async ({ page }) => {
  await setupClerkTestingToken({ page })
  const teacher: PublicTeacherDto = {
    id: 'public-teacher', slug: 'public-teacher', headline: 'מורה למתמטיקה', bio: 'שיעורים אישיים במתמטיקה',
    hourly_price: 120, currency: 'ILS', years_experience: 2, teaches_online: true, teaches_in_person: false,
    verification_status: 'unverified', average_rating: 0, review_count: 0, response_rate: 0, response_time_minutes: null,
    is_founder: false, published_at: null, profile: { first_name: 'דנה', last_name: 'כהן', avatar_path: null },
    subjects: [], service_areas: [],
  }
  await page.route('**/api/teachers/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/missing-teacher')) return route.fulfill({ status: 404, json: { message: 'Teacher not found' } })
    if (path.endsWith('/public-teacher')) return route.fulfill({ json: teacher })
    if (path.endsWith('/availability')) return route.fulfill({ json: { slots: [] } })
    return route.fulfill({ json: { items: [], page: 1, limit: 20, hasMore: false } })
  })
  await page.goto('/teachers/public-teacher?schedule=1')
  await expect(page).toHaveTitle('דנה כהן — מורה פרטי | מורהלי')
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', 'דנה כהן: מורה למתמטיקה')
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', 'https://morehli.co.il/teachers/public-teacher')
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0)
  await page.goto('/teachers/missing-teacher')
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})
