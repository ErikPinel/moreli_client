import { expect, test } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { readFileSync } from 'node:fs'
import type { PublicTeacherDto } from '../src/types/api'

const subjects: Array<{ name_he: string; slug: string }> = JSON.parse(readFileSync(new URL('../src/data/professions.json', import.meta.url), 'utf8'))
const math = subjects.find(item => item.name_he === 'מתמטיקה - הכל')!
const english = subjects.find(item => item.name_he === 'אנגלית - הכל')!
const teacher = (name: string, online: boolean, inPerson: boolean): PublicTeacherDto => ({
  id: name, slug: name, headline: name, bio: 'מורה לבדיקת סינון', hourly_price: 120,
  currency: 'ILS', years_experience: 5, teaches_online: online, teaches_in_person: inPerson,
  verification_status: 'unverified', average_rating: 5, review_count: 1,
  response_rate: 100, response_time_minutes: 30, is_founder: false, published_at: null,
  profile: { first_name: name, last_name: '', avatar_path: null },
  subjects: [{ subject_id: 1, experience_years: null, description: null, subject: { id: 1, name_he: math.name_he, name_en: 'Math', slug: math.slug } }],
  service_areas: inPerson ? [
    { city_id: 2, city: { id: 2, name_he: 'חיפה', name_en: 'Haifa', slug: 'haifa' } },
    { city_id: 1, city: { id: 1, name_he: 'פתח תקווה', name_en: 'Petah Tikva', slug: 'petah-tikva' } },
  ] : [],
})

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.route('**/api/subjects', route => route.fulfill({ json: [math, english].map((item, index) => ({ ...item, id: index + 1, name_en: '', parent_id: null, sort_order: index })) }))
  await page.route('**/api/cities', route => route.fulfill({ json: [
    { id: 1, name_he: 'פתח תקווה', name_en: 'Petah Tikva', slug: 'petah-tikva' },
    { id: 2, name_he: 'חיפה', name_en: 'Haifa', slug: 'haifa' },
  ] }))
})

for (const location of ['פתח תקווה', 'אונליין']) {
  test(`homepage search keeps the chosen subject and location: ${location}`, async ({ page }) => {
    await page.route('**/api/teachers?**', route => route.fulfill({ json: {
      items: [], page: 1, limit: 20, hasMore: false, meta: { total: 0, pageCount: 0 },
    } }))
    await page.goto('/')
    const search = page.getByRole('form', { name: 'איזה מורה אתם מחפשים?', exact: true })
    await search.getByRole('combobox', { name: 'מה תרצו ללמוד?', exact: true }).fill('מתמטיקה')
    await search.getByRole('option', { name: math.name_he, exact: true }).click()
    await search.getByRole('combobox', { name: 'איפה תרצו ללמוד?', exact: true }).fill(location)
    await search.getByRole('option', { name: location, exact: true }).click()
    await search.getByRole('button', { name: 'מצאו לי מורה', exact: true }).click()
    await expect(page).toHaveURL(/\/teachers\?/)
    const params = new URL(page.url()).searchParams
    expect(params.get('subject')).toBe(math.slug)
    if (location === 'אונליין') {
      expect(params.get('online')).toBe('true')
      expect(params.get('inPerson')).toBe('false')
      expect(params.has('city')).toBe(false)
    } else {
      expect(params.get('city')).toBe('petah-tikva')
    }
  })
}

test('city searches separate local in-person teachers from online teachers and ignore old levels', async ({ page }) => {
  const requests: URLSearchParams[] = []
  await page.route('**/api/teachers?**', route => {
    const params = new URL(route.request().url()).searchParams
    requests.push(params)
    const local = params.get('inPersonOk') === 'true'
    const items = [teacher(local ? 'LocalTeacher' : 'OnlineTeacher', !local, local)]
    return route.fulfill({ json: { items, page: 1, limit: 20, hasMore: false, meta: { total: 1, pageCount: 1 } } })
  })
  await page.goto(`/teachers?subject=${math.slug}&city=petah-tikva&level=high-school`)
  const local = page.getByRole('region', { name: 'מורים פרונטליים', exact: true })
  const online = page.getByRole('region', { name: 'מורים אונליין', exact: true })
  await expect(local.getByRole('heading', { name: 'LocalTeacher', exact: true })).toBeVisible()
  await expect(local.getByText('OnlineTeacher', { exact: true })).toHaveCount(0)
  await expect(online.getByRole('heading', { name: 'OnlineTeacher', exact: true })).toBeVisible()
  await expect(online.getByText('LocalTeacher', { exact: true })).toHaveCount(0)
  await expect(local.locator('.teacher-result-card__location')).toHaveText('פתח תקווה · פרונטלי')
  await expect(online.locator('.teacher-result-card__location')).toHaveText('אונליין · מכל מקום')
  await expect(page.getByText('רמה', { exact: true })).toHaveCount(0)
  expect(requests.some(params => params.get('citySlug') === 'petah-tikva' && params.get('onlineOk') === 'false' && params.get('inPersonOk') === 'true')).toBe(true)
  expect(requests.some(params => !params.has('citySlug') && params.get('onlineOk') === 'true' && params.get('inPersonOk') === 'false')).toBe(true)
  expect(requests.every(params => params.get('subjectSlug') === math.slug && !params.has('levelId'))).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('subject and price filters apply to both sections, while pagination is independent', async ({ page }) => {
  const requests: URLSearchParams[] = []
  await page.route('**/api/teachers?**', route => {
    const params = new URL(route.request().url()).searchParams
    requests.push(params)
    const local = params.get('inPersonOk') === 'true'
    const currentPage = Number(params.get('page') ?? 1)
    return route.fulfill({ json: {
      items: [teacher(`${local ? 'Local' : 'Online'}Page${currentPage}`, !local, local)],
      page: currentPage, limit: 20, hasMore: currentPage === 1,
      meta: { total: 21, pageCount: 2 },
    } })
  })
  await page.goto(`/teachers?subject=${math.slug}&city=petah-tikva&priceMin=90&priceMax=150&sort=price_asc`)
  const local = page.getByRole('region', { name: 'מורים פרונטליים', exact: true })
  const online = page.getByRole('region', { name: 'מורים אונליין', exact: true })
  await expect(local.getByRole('heading', { name: 'LocalPage1', exact: true })).toBeVisible()
  await expect(online.getByRole('heading', { name: 'OnlinePage1', exact: true })).toBeVisible()
  await local.getByRole('button', { name: 'העמוד הבא', exact: true }).click()
  await expect(local.getByRole('heading', { name: 'LocalPage2', exact: true })).toBeVisible()
  await expect(online.getByRole('heading', { name: 'OnlinePage1', exact: true })).toBeVisible()
  await online.getByRole('button', { name: 'העמוד הבא', exact: true }).click()
  await expect(online.getByRole('heading', { name: 'OnlinePage2', exact: true })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('page')).toBe('2')
  expect(new URL(page.url()).searchParams.get('onlinePage')).toBe('2')
  expect(requests.every(params => params.get('subjectSlug') === math.slug && params.get('budgetMin') === '90' && params.get('budgetMax') === '150' && params.get('sort') === 'price_asc')).toBe(true)
  await page.getByRole('button', { name: 'ניקוי הכל', exact: true }).click()
  await expect(page).toHaveURL(/\/teachers$/)
})

test('an empty local section does not hide online matches; lesson-mode toggles are respected', async ({ page }) => {
  await page.route('**/api/teachers?**', route => {
    const local = new URL(route.request().url()).searchParams.get('inPersonOk') === 'true'
    const items = local ? [] : [teacher('OnlineOnly', true, false)]
    return route.fulfill({ json: { items, page: 1, limit: 20, hasMore: false, meta: { total: items.length, pageCount: items.length } } })
  })
  await page.goto(`/teachers?subject=${math.slug}&city=petah-tikva`)
  await expect(page.getByRole('region', { name: 'מורים פרונטליים', exact: true }).locator('.search-empty')).toBeVisible()
  await expect(page.getByRole('region', { name: 'מורים אונליין', exact: true }).getByRole('heading', { name: 'OnlineOnly', exact: true })).toBeVisible()
  await page.goto(`/teachers?subject=${math.slug}&city=petah-tikva&online=false&inPerson=true`)
  await expect(page.getByRole('region', { name: 'מורים פרונטליים', exact: true }).locator('.search-empty')).toBeVisible()
  await expect(page.getByRole('region', { name: 'מורים אונליין', exact: true })).toHaveCount(0)
  await page.goto(`/teachers?subject=${math.slug}&city=petah-tikva&online=true&inPerson=false`)
  await expect(page.getByRole('region', { name: 'מורים אונליין', exact: true }).getByRole('heading', { name: 'OnlineOnly', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'מורים פרונטליים', exact: true })).toHaveCount(0)
})

test('toolbar selections really update subject and city requests', async ({ page }) => {
  const requests: URLSearchParams[] = []
  await page.route('**/api/teachers?**', route => {
    const params = new URL(route.request().url()).searchParams
    requests.push(params)
    return route.fulfill({ json: { items: [], page: 1, limit: 20, hasMore: false, meta: { total: 0, pageCount: 0 } } })
  })
  await page.goto('/teachers')
  const toolbar = page.locator('.results-toolbar')
  await toolbar.getByRole('combobox', { name: 'מה תרצו ללמוד?', exact: true }).fill('אנגלית - הכל')
  await toolbar.getByRole('option', { name: 'אנגלית - הכל', exact: true }).click()
  await toolbar.getByRole('combobox', { name: 'איפה?', exact: true }).fill('פתח תקווה')
  await toolbar.getByRole('option', { name: 'פתח תקווה', exact: true }).click()
  await toolbar.getByRole('button', { name: 'חיפוש', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`subject=${english.slug}&city=petah-tikva`))
  await expect.poll(() => requests.filter(params => params.get('subjectSlug') === english.slug).length).toBe(2)
  expect(requests.some(params => params.get('subjectSlug') === english.slug && params.get('citySlug') === 'petah-tikva' && params.get('onlineOk') === 'false')).toBe(true)
})

test.describe('responsive teacher pages', () => {
  const responsiveTeacher: PublicTeacherDto = {
    ...teacher('responsive-teacher', true, true),
    headline: 'Personal mathematics lessons, online and close to home',
    bio: 'מורה קשוב שמסביר בצורה ברורה ומתקדם בקצב שלכם. '.repeat(12),
    profile: { first_name: 'Alexandria Longlastname', last_name: 'כהן לוי', avatar_path: '/responsive-portrait.svg' },
    verification_status: 'verified',
    subjects: Array.from({ length: 7 }, (_, index) => ({
      subject_id: index + 1, experience_years: null, description: null,
      subject: { id: index + 1, name_he: `מתמטיקה ופתרון בעיות ברמת לימוד ${index + 1}`, name_en: 'Math', slug: `subject-${index}` },
    })),
  }
  const viewportWidths = [320, 390, 768, 1024, 1280]

  test.beforeEach(async ({ page }) => {
    await page.route('**/responsive-portrait.svg', route => route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#dfe9e0"/><circle cx="120" cy="105" r="55" fill="#436452"/><path d="M25 360V260a95 95 0 01190 0v100" fill="#436452"/></svg>',
    }))
  })

  test('result portraits, long names and controls never overlap from small mobile through desktop', async ({ page }, testInfo) => {
    const missingPhoto = { ...responsiveTeacher, id: 'no-photo', slug: 'no-photo', profile: { ...responsiveTeacher.profile, first_name: 'שםארוךמאודלבדיקתשבירתמיליםבכרטיסהמורה', avatar_path: null } }
    await page.route('**/api/teachers?**', route => route.fulfill({ json: {
      items: [responsiveTeacher, missingPhoto], page: 1, limit: 20, hasMore: false, meta: { total: 2, pageCount: 1 },
    } }))
    await page.route('**/api/teachers/responsive-teacher', route => route.fulfill({ json: responsiveTeacher }))
    await page.route('**/api/teachers/responsive-teacher/availability', route => route.fulfill({ json: { slots: [] } }))
    await page.route('**/api/teachers/responsive-teacher/reviews?**', route => route.fulfill({ json: { items: [], page: 1, limit: 20, hasMore: false } }))
    await page.goto('/teachers')
    const cards = page.locator('.teacher-result-card')
    await expect(cards).toHaveCount(2)
    await expect.poll(() => cards.first().locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 })
      for (const card of await cards.all()) {
        const geometry = await card.evaluate(el => {
          const rect = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().toJSON()
          const subjects = el.querySelector('.teacher-result-card__subjects')!
          return { card: el.getBoundingClientRect().toJSON(), photo: rect('.teacher-result-card__photo'), body: rect('.teacher-result-card__body'), name: rect('h2'), favorite: rect('header > a'), action: rect('.teacher-result-card__profile-label'), subjects: subjects.getBoundingClientRect().toJSON(), lineHeight: parseFloat(getComputedStyle(subjects).lineHeight), fontSize: parseFloat(getComputedStyle(subjects).fontSize) }
        })
        expect(geometry.photo.x - geometry.body.right, `${width}px photo/body separation`).toBeGreaterThanOrEqual(11)
        expect(Math.abs(geometry.photo.height - geometry.photo.width)).toBeLessThan(1)
        expect(geometry.name.left - geometry.favorite.right, `${width}px name/favorite separation`).toBeGreaterThanOrEqual(9)
        expect(geometry.name.width).toBeGreaterThan(50)
        expect(geometry.favorite.width).toBeGreaterThanOrEqual(44)
        expect(geometry.favorite.height).toBeGreaterThanOrEqual(44)
        expect(geometry.action.height).toBeGreaterThanOrEqual(44)
        expect(geometry.subjects.height).toBeLessThanOrEqual(geometry.lineHeight * 2 + 1)
        expect(geometry.fontSize).toBeGreaterThanOrEqual(13)
      }
      const helper = await page.getByRole('link', { name: 'עזרה ודיווח תקלה', exact: true }).boundingBox()
      expect(helper?.width).toBe(44)
      expect(helper?.height).toBe(44)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px page overflow`).toBe(true)
      if (width === 390 || width === 1280) await page.screenshot({ path: testInfo.outputPath(`results-${width}.png`), fullPage: true })
    }
    await cards.first().getByRole('link', { name: /^לפרופיל של/ }).click()
    await expect(page).toHaveURL(/\/teachers\/responsive-teacher$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alexandria Longlastname כהן לוי')
  })

  test('public teacher profiles keep square portraits, readable metadata and clear booking at every breakpoint', async ({ page }, testInfo) => {
    await page.route('**/api/teachers/responsive-teacher', route => route.fulfill({ json: responsiveTeacher }))
    await page.route('**/api/teachers/responsive-teacher/availability', route => route.fulfill({ json: {
      slots: Array.from({ length: 5 }, (_, day) => ({ id: day + 1, day_of_week: day, start_time: '09:00:00', end_time: '21:00:00' })),
    } }))
    await page.route('**/api/teachers/responsive-teacher/reviews?**', route => route.fulfill({ json: {
      items: [
        { id: 'rating-only', rating: 4, body: null, created_at: '2026-10-23T10:00:00Z', teacher_reply: null },
        { id: 'written', rating: 5, body: 'מורה מצוין. Clear explanations. ' + 'LongUnbrokenWord'.repeat(12), created_at: '2026-10-22T10:00:00Z', teacher_reply: 'תודה על המשוב', teacher_reply_at: '2026-10-23T11:00:00Z' },
      ], page: 1, limit: 20, hasMore: false,
    } }))
    await page.goto('/teachers/responsive-teacher')
    await expect(page.locator('.teacher-public-hero__portrait img')).toBeVisible()
    await expect(page.locator('.public-review')).toHaveCount(2)
    await page.evaluate(() => document.fonts.ready)
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 })
      const geometry = await page.locator('.teacher-public-hero__inner').evaluate(el => {
        const rect = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().toJSON()
        return { hero: el.getBoundingClientRect().toJSON(), portrait: rect('.teacher-public-hero__portrait'), image: rect('.teacher-avatar img'), identity: rect('.teacher-public-hero__identity'), meta: rect('.teacher-public-hero__meta'), booking: rect('.teacher-public-booking'), button: rect('.teacher-public-booking button') }
      })
      expect(Math.abs(geometry.portrait.width - geometry.portrait.height)).toBeLessThan(1)
      expect(geometry.image.height).toBeLessThanOrEqual(geometry.portrait.height)
      expect(geometry.portrait.left - geometry.identity.right).toBeGreaterThanOrEqual(15)
      expect(geometry.identity.width).toBeGreaterThan(120)
      expect(geometry.button.height).toBeGreaterThanOrEqual(44)
      if (width < 768) {
        expect(geometry.meta.top).toBeGreaterThanOrEqual(Math.max(geometry.identity.bottom, geometry.portrait.bottom) + 15)
        expect(geometry.booking.top).toBeGreaterThanOrEqual(geometry.meta.bottom + 15)
      } else {
        expect(geometry.identity.left - geometry.booking.right).toBeGreaterThanOrEqual(27)
      }
      await expect(page.locator('.public-slot bdi').first()).toHaveAttribute('dir', 'ltr')
      await expect(page.locator('.public-review__body').first()).toHaveText('')
      for (const action of await page.locator('.public-reviews__actions a, .public-review__report').all()) {
        expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px profile overflow`).toBe(true)
      if (width === 390 || width === 1280) await page.screenshot({ path: testInfo.outputPath(`profile-${width}.png`), fullPage: true })
    }
    await page.getByRole('button', { name: 'בקשת שיעור', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?redirect=.*schedule%3D1/)
  })
})
