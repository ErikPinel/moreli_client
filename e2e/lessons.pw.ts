import { expect, test, type Page } from '@playwright/test'
import { DateTime } from 'luxon'
import type { LessonDto, ReviewDto } from '../src/types/api'

const zone = 'Asia/Jerusalem'
const teacherId = '00000000-0000-0000-0000-000000000001'
const ownerId = '00000000-0000-0000-0000-000000000002'
const studentId = '00000000-0000-0000-0000-000000000003'
const sunday = () => {
  const today = DateTime.now().setZone(zone).startOf('day')
  return today.minus({ days: today.weekday % 7 })
}
async function preview(page: Page, path: string, role: 'student' | 'teacher' | 'guest' = 'teacher', dualRole = false, legacyOverlap = false, legacyUndated = false) {
  const future = sunday().plus({ weeks: 1 }).set({ hour: 10 })
  const student = { id: studentId, first_name: 'Case', last_name: 'Student', phone: '0500000000', contact_email: 'student@example.com' }
  const teacher = { id: teacherId, user_id: ownerId, slug: 'preview-teacher', headline: 'מורה למתמטיקה', profile: { first_name: 'Case', last_name: 'Teacher', phone: '0500000001', contact_email: 'teacher@example.com' } }
  const makeLesson = (id: string, start: DateTime, status: LessonDto['status'] = 'scheduled'): LessonDto => ({
    id, teacher_id: teacherId, student_id: studentId, connection_inquiry_id: 'connection-preview', source_inquiry_id: null,
    starts_at: start.toUTC().toISO()!, ends_at: start.plus({ hours: 1 }).toUTC().toISO()!, mode: 'online', status,
    student_completed_at: status === 'completed' ? start.plus({ hours: 2 }).toUTC().toISO() : null,
    teacher_completed_at: status === 'completed' ? start.plus({ hours: 2 }).toUTC().toISO() : null,
    note: null, revision: 1, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z', student, teacher,
  })
  const lessons = Array.from({ length: 8 }, (_, index) => makeLesson(`lesson-${index}`, future.plus({ days: index % 5, hours: Math.floor(index / 5) }))).reverse()
  lessons.push(makeLesson('past-awaiting', DateTime.now().setZone(zone).minus({ days: 1 }).set({ hour: 10 })))
  lessons.push(makeLesson('past-completed', DateTime.now().setZone(zone).minus({ days: 2 }).set({ hour: 10 }), 'completed'))
  if (legacyOverlap) lessons.push(makeLesson('legacy-overlap', future))
  if (legacyUndated) lessons.push({ ...makeLesson('legacy-undated', future), starts_at: null, ends_at: null, status: 'needs_scheduling' })
  if (dualRole) {
    lessons[0] = { ...lessons[0], student_id: ownerId, student: { ...student, id: ownerId }, teacher: { ...teacher, user_id: 'other-teacher-user' } }
  }
  const reads: URL[] = []
  const ownedReviews: ReviewDto[] = []
  const writes: { path: string; body: Record<string, unknown> }[] = []
  const unexpected: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('http://localhost:5146/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const apiPath = url.pathname.replace('/api', '')
    const headers = { 'access-control-allow-origin': 'http://localhost:5176', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() === 'GET') {
      reads.push(url)
      if (apiPath === '/lessons') {
        const view = url.searchParams.get('view')
        let items = lessons.slice()
        if (view === 'upcoming') items = items.filter(lesson => lesson.status === 'scheduled' && Date.parse(lesson.ends_at!) > Date.now())
        if (view === 'needs_action') items = items.filter(lesson => lesson.status === 'needs_scheduling' || lesson.status === 'scheduled' && Date.parse(lesson.ends_at!) <= Date.now())
        if (view === 'past') items = items.filter(lesson => Date.parse(lesson.ends_at!) <= Date.now())
        if (view === 'completed') items = items.filter(lesson => lesson.status === 'completed')
        if (url.searchParams.has('from')) items = items.filter(lesson => Date.parse(lesson.ends_at!) > Date.parse(url.searchParams.get('from')!))
        if (url.searchParams.has('to')) items = items.filter(lesson => Date.parse(lesson.starts_at!) < Date.parse(url.searchParams.get('to')!))
        items.sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!))
        const limit = Number(url.searchParams.get('limit') ?? 20)
        const page = Number(url.searchParams.get('page') ?? 1)
        return route.fulfill({ headers, json: { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit, hasMore: page * limit < items.length } })
      }
      if (apiPath === '/lessons/calendar') return route.fulfill({ headers, json: { timezone: zone, usesDefault: false, locationName: 'ירושלים', locationFallback: true, duration: 60, shabbat: [], days: [{ date: future.toISODate(), times: [{ time: '16:00', startAt: future.set({ hour: 16 }).toUTC().toISO(), endAt: future.set({ hour: 17 }).toUTC().toISO() }] }] } })
      if (apiPath === `/lessons/students/${studentId}`) return route.fulfill({ headers, json: student })
      if (apiPath.startsWith('/lessons/') || apiPath.startsWith('/admin/lessons/')) {
        const lesson = lessons.find(item => item.id === apiPath.split('/').at(-1))
        if (lesson) return route.fulfill({ headers, json: lesson })
      }
      if (apiPath === '/teachers/me') return route.fulfill({ headers, json: { ...teacher, profile_status: 'published', availability_customized: true, availability: [], subjects: [], service_areas: [] } })
      if (apiPath === '/teachers/me/access') return route.fulfill({ headers, json: { freeContactUsed: true, paidUntil: '2099-12-31T00:00:00Z', active: true, canAcceptNewContact: true, payments: [] } })
      if (apiPath === '/teachers/me/schedule') return route.fulfill({ headers, json: [{ id: 'custom-1', teacher_id: teacherId, day_of_week: 0, start_time: '10:00:00', end_time: '12:00:00', timezone: zone, is_active: true }, { id: 'custom-2', teacher_id: teacherId, day_of_week: 6, start_time: '22:00:00', end_time: '23:00:00', timezone: zone, is_active: true }] })
      if (apiPath === '/inquiries') return route.fulfill({ headers, json: { items: url.searchParams.get('status') === 'accepted' ? [{ id: 'connection-preview', student_id: studentId, status: 'accepted', student }] : [], page: 1, limit: 50, hasMore: false } })
      if (apiPath === '/notifications/unread-count') return route.fulfill({ headers, json: { count: 0 } })
      if (apiPath === '/reviews/me') return route.fulfill({ headers, json: ownedReviews })
      if (apiPath === '/teachers/preview-teacher') return route.fulfill({ headers, json: { ...teacher, bio: 'מורה ללמידה אישית', hourly_price: 100, currency: 'ILS', teaches_online: true, teaches_in_person: true, years_experience: 3, subjects: [], service_areas: [], profile: { ...teacher.profile, city: null, avatar_path: null }, average_rating: ownedReviews[0]?.rating ?? 0, review_count: ownedReviews.length } })
      if (apiPath === '/teachers/preview-teacher/availability') return route.fulfill({ headers, json: { slots: [] } })
      if (apiPath === '/teachers/preview-teacher/reviews') return route.fulfill({ headers, json: { items: ownedReviews.filter(review => review.status === 'published'), page: 1, limit: 20, hasMore: false } })
      if (apiPath === '/support/contact') return route.fulfill({ headers, json: { email: 'support@example.com', phone: '0500000000' } })
      if (apiPath === '/admin/support-tickets') return route.fulfill({ headers, json: { items: [], page: 1, limit: 10, hasMore: false } })
      if (apiPath === '/admin/support-tickets/lesson-case') return route.fulfill({ headers, json: {
        id: 'lesson-case', user_id: studentId, category: 'report', subject: 'בירור השיעור הנוסף', message: 'הדיווח מתייחס לשיעור הנוסף ולא לפנייה הראשונה.',
        status: 'open', created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z', teacher_id: teacherId,
        inquiry_id: 'connection-preview', lesson_id: 'lesson-0', workflow: null, payment_id: null, review_id: null, requester_teacher: null, messages: [],
      } })
      unexpected.push(apiPath)
      return route.fulfill({ headers, status: 404, json: { message: 'Unexpected preview request' } })
    }
    const body = request.postDataJSON()
    writes.push({ path: apiPath, body })
    if (apiPath === '/reviews' && request.method() === 'POST') {
      const review: ReviewDto = { id: 'preview-rating', student_id: studentId, teacher_id: String(body.teacherId), inquiry_id: null, rating: Number(body.rating), body: String(body.body).trim() || null, status: 'published', created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z', teacher_reply: null, teacher_reply_at: null, teacher_reply_status: null }
      ownedReviews.push(review)
      return route.fulfill({ headers, json: review })
    }
    if (apiPath === '/lessons' && request.method() === 'POST') {
      const lesson = { ...makeLesson('added-lesson', DateTime.fromISO(String(body.startsAt))), ends_at: String(body.endsAt) }
      lessons.push(lesson)
      return route.fulfill({ headers, json: lesson })
    }
    if (apiPath === '/teachers/me/availability') return route.fulfill({ headers, json: [] })
    if (apiPath.endsWith('/state')) {
      const lesson = lessons.find(item => item.id === apiPath.split('/')[2])!
      lesson.status = body.action === 'cancel' ? 'cancelled' : 'scheduled'
      lesson.student_completed_at = DateTime.now().toUTC().toISO()
      return route.fulfill({ headers, json: lesson })
    }
    unexpected.push(`${request.method()} ${apiPath}`)
    return route.fulfill({ headers, status: 400, json: { message: 'Unexpected preview mutation' } })
  })
  const source = await (await page.request.get('/src/pages/LessonPages.tsx')).text()
  const main = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (text: string, name: string) => {
    const value = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]).find(value => value.includes(`/${name}.js`))
    if (!value) throw new Error(`Missing preview dependency ${name}`)
    return value
  }
  const modules = { react: dependency(source, 'react'), dom: dependency(main, 'react-dom_client'), query: dependency(source, '@tanstack_react-query'), router: dependency(source, 'react-router-dom') }
  await page.route('http://localhost:5176/lessons-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><div id="preview"></div></body></html>' }))
  await page.goto('/lessons-preview')
  await page.evaluate(async ({ modules, path, role, userId }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, pages, teacher, auth, admin, publicPages, student] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom), import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router),
      import('/src/pages/LessonPages.tsx'), import('/src/pages/TeacherAccountPages.tsx'), import('/src/auth/auth-context.ts'), import('/src/features/account/AdminEngagementPanel.tsx'),
      import('/src/pages/TeachersPage.tsx'), import('/src/pages/StudentAccountPages.tsx'),
    ])
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    const routes = [['/teacher/dashboard', teacher.TeacherDashboardPage], ['/student/dashboard', pages.StudentDashboardPage], ['/teacher/lessons', pages.LessonsPage], ['/student/lessons', pages.LessonsPage], ['/teacher/lessons/:id', pages.LessonDetailPage], ['/student/lessons/:id', pages.LessonDetailPage], ['/teacher/students/:id', pages.TeacherStudentLessonsPage], ['/teacher/schedule', teacher.TeacherSchedulePage], ['/admin/support', admin.AdminSupportPage], ['/admin/activity', admin.AdminActivityPage], ['/teachers/:slug', publicPages.TeacherPublicProfilePage], ['/student/reviews', student.StudentReviewsPage]]
    const context = { user: null, profile: role === 'guest' ? null : { id: userId, role, first_name: 'Preview', last_name: 'Account', contact_email: 'preview@example.com', phone: '0500000000', city_id: null, avatar_path: null }, isLoading: false, signOut: async () => {} }
    ReactDOM.createRoot(document.getElementById('preview')!).render(React.createElement(auth.AuthContext.Provider, { value: context },
      React.createElement(query.QueryClientProvider, { client: new query.QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        React.createElement(router.MemoryRouter, { initialEntries: [path] }, React.createElement(router.Routes, null, ...routes.map(([path, component]) => React.createElement(router.Route, { key: path, path, element: React.createElement(component) })))))))
  }, { modules, path, role, userId: role === 'student' ? studentId : ownerId })
  return { lessons, reads, writes, unexpected, errors, future, ownedReviews }
}

for (const side of ['teacher', 'student'] as const) {
  test(`${side} dashboard shows the actual next five lessons, in order, separately from actions`, async ({ page }, testInfo) => {
    const fixture = await preview(page, `/${side}/dashboard`, side)
    const upcoming = page.locator('.upcoming-lessons')
    await expect(upcoming.locator('.lesson-row')).toHaveCount(5)
    const expected = fixture.lessons.filter(lesson => Date.parse(lesson.ends_at!) > Date.now()).sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!)).slice(0, 5)
    expect(await upcoming.locator('.lesson-row').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(expected.map(lesson => `/${side}/lessons/${lesson.id}`))
    await expect(page.locator('.lesson-attention')).toContainText('שיעור אחד מצריך עדכון')
    expect(fixture.reads.some(url => url.pathname.endsWith('/lessons') && url.searchParams.get('view') === 'upcoming' && url.searchParams.get('limit') === '5')).toBe(true)
    await expect(page.getByText('פניות אחרונות', { exact: true })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(fixture.writes).toEqual([])
    expect(fixture.errors).toEqual([])
    expect(fixture.unexpected).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`${side}-dashboard.png`), fullPage: true })
  })
}

test('weekly calendar navigates Sunday-based Israel-local weeks without losing lessons at DST', async ({ page }, testInfo) => {
  const fixture = await preview(page, '/teacher/lessons', 'teacher', false, true)
  await expect(page.locator('.lesson-calendar__day')).toHaveCount(7)
  await page.getByRole('button', { name: 'השבוע הבא', exact: true }).click()
  await expect(page.locator('.lesson-calendar__event')).toHaveCount(9)
  const original = await page.locator('.lesson-calendar__event[href="/teacher/lessons/lesson-0"]').boundingBox()
  const legacy = await page.locator('.lesson-calendar__event[href="/teacher/lessons/legacy-overlap"]').boundingBox()
  expect(original && legacy && (original.x + original.width <= legacy.x || legacy.x + legacy.width <= original.x)).toBe(true)
  const from = fixture.future.startOf('day').toUTC().toISO()!
  const to = fixture.future.startOf('day').plus({ weeks: 1 }).toUTC().toISO()!
  expect(fixture.reads.some(url => url.searchParams.get('view') === 'week' && url.searchParams.get('from') === from && url.searchParams.get('to') === to)).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('weekly-lessons.png'), fullPage: true })
  await page.getByRole('button', { name: 'השבוע הנוכחי', exact: true }).click()
  const currentFrom = sunday().toMillis()
  const currentTo = sunday().plus({ weeks: 1 }).toMillis()
  await expect(page.locator('.lesson-calendar__event')).toHaveCount(fixture.lessons.filter(lesson => Date.parse(lesson.starts_at!) >= currentFrom && Date.parse(lesson.ends_at!) < currentTo).length)
  expect(fixture.errors).toEqual([])
  expect(fixture.unexpected).toEqual([])
})

test('student history distinguishes completed lessons and lets the teacher schedule a notified additional lesson', async ({ page }) => {
  const fixture = await preview(page, `/teacher/students/${studentId}`, 'teacher', false, false, true)
  await expect(page.getByRole('heading', { name: 'שיעורים קרובים', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'היסטוריית שיעורים', exact: true })).toBeVisible()
  await expect(page.locator('a[href="/teacher/lessons/legacy-undated"]')).toContainText('צריך לקבוע מועד')
  expect(fixture.reads.some(url => url.pathname === '/api/lessons' && url.searchParams.get('studentId') === studentId && url.searchParams.get('view') === 'needs_action')).toBe(true)
  await expect(page.getByText('התקיים · אושר על ידי שניכם', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'קביעת שיעור נוסף', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('אין צורך באישור נוסף')
  await dialog.getByRole('textbox', { name: 'תאריך', exact: true }).fill(fixture.future.toFormat('dd/MM/yyyy'))
  await expect(dialog.getByRole('combobox', { name: 'שעת התחלה · שעון ישראל' })).toHaveValue(fixture.future.set({ hour: 16 }).toUTC().toISO()!)
  await dialog.getByRole('button', { name: 'קביעת שיעור ושליחת הודעה' }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.writes).toHaveLength(1)
  expect(fixture.writes[0]).toMatchObject({ path: '/lessons', body: { studentId, startsAt: fixture.future.set({ hour: 16 }).toUTC().toISO(), endsAt: fixture.future.set({ hour: 17 }).toUTC().toISO(), mode: 'online' } })
  expect(fixture.writes[0].body.requestKey).toMatch(/^[\da-f-]{36}$/)
  await expect(page.locator('a[href="/teacher/lessons/added-lesson"]')).toBeVisible()
  expect(fixture.errors).toEqual([])
  expect(fixture.unexpected).toEqual([])
})

test('availability has exactly 7×12 hourly cells and stays synchronized with precise fields and off-grid hours', async ({ page }, testInfo) => {
  const fixture = await preview(page, '/teacher/schedule')
  const grid = page.locator('.availability-grid')
  await expect(grid.locator('tbody tr')).toHaveCount(12)
  await expect(grid.getByRole('button')).toHaveCount(84)
  await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(2)
  await grid.getByRole('button', { name: 'יום ראשון, 10:00 עד 11:00, נבחר', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'שעת התחלה', exact: true }).first()).toHaveValue('11:00')
  await grid.getByRole('button', { name: 'יום שני, 9:00 עד 10:00, לא נבחר', exact: true }).click()
  await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(2)
  expect(fixture.writes).toEqual([])
  await page.getByRole('button', { name: 'שמירת זמינות', exact: true }).click()
  await expect.poll(() => fixture.writes.length).toBe(1)
  expect(fixture.writes[0]).toMatchObject({ path: '/teachers/me/availability', body: { slots: [
    { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' },
    { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
    { dayOfWeek: 6, startTime: '22:00', endTime: '23:00' },
  ] } })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(fixture.errors).toEqual([])
  expect(fixture.unexpected).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('availability.png'), fullPage: true })
})

test('dual-role notification links resolve the real participant side and require explicit attendance confirmation', async ({ page }) => {
  const fixture = await preview(page, '/teacher/lessons/lesson-7', 'teacher', true)
  await expect(page.locator('a[href="/student/lessons"]').filter({ hasText: 'חזרה ללוח השיעורים' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'אישור שהשיעור התקיים', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'שינוי מועד', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'עזרה או בירור לגבי השיעור הזה' })).toHaveAttribute('href', '/support?category=support&lesson=lesson-7')
  expect(fixture.writes).toEqual([])
  expect(fixture.errors).toEqual([])
})

test('admin lesson reports show the exact additional lesson, not the connection’s original appointment', async ({ page }) => {
  const fixture = await preview(page, '/admin/support?ticket=lesson-case')
  const lesson = page.getByRole('region', { name: 'השיעור שאליו מתייחסת הפנייה' })
  await expect(lesson).toContainText('lesson-0')
  await expect(lesson).toContainText('אישור תלמיד: לא נרשם')
  await expect(page.getByRole('link', { name: 'בדיקת פרופיל המורה המדווח' })).toHaveCount(0)
  await page.getByRole('link', { name: 'פתיחת השיעור לבירור' }).click()
  await expect(page.getByRole('heading', { name: 'בירור שיעור', exact: true })).toBeVisible()
  await expect(page.getByText('אין פנייה פתוחה לבירור.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'פתיחת השיעור לבירור' })).toHaveCount(0)
  expect(fixture.writes).toEqual([])
  expect(fixture.unexpected).toEqual([])
  expect(fixture.errors).toEqual([])
})

for (const comment of ['', 'מורה קשוב עם הסברים ברורים']) {
  test(`signed-in student can rate without any inquiry or lesson, ${comment ? 'with' : 'without'} a comment`, async ({ page }) => {
    const fixture = await preview(page, '/teachers/preview-teacher', 'student')
    await page.getByRole('button', { name: 'הוספת דירוג', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const publish = dialog.getByRole('button', { name: 'פרסום דירוג', exact: true })
    await dialog.getByRole('checkbox').check()
    await expect(publish).toBeDisabled()
    await dialog.getByTitle('3 מתוך 5', { exact: true }).click()
    if (comment) await dialog.getByRole('textbox', { name: 'תגובה', exact: false }).fill(comment)
    await publish.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'עריכת הדירוג שלי', exact: true })).toBeVisible()
    expect(fixture.writes).toEqual([{ path: '/reviews', body: { teacherId, rating: 3, body: comment } }])
    expect(fixture.ownedReviews[0]).toMatchObject({ rating: 3, body: comment || null, inquiry_id: null })
    const card = page.locator('.public-reviews article')
    await expect(card.getByRole('img', { name: '3 מתוך 5', exact: true })).toBeVisible()
    await expect(card.locator('p').first()).toHaveText(comment)
    await expect(page.getByText('דירוג ללא טקסט', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'עריכת הדירוג שלי', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('radio', { name: '3 מתוך 5', exact: true })).toBeChecked()
    expect(fixture.reads.some(url => url.pathname === '/api/inquiries' || url.pathname === '/api/lessons')).toBe(false)
    expect(fixture.errors).toEqual([])
    expect(fixture.unexpected).toEqual([])
  })
}

test('guests must sign in to rate and teachers have a navbar dashboard shortcut and new-lesson action', async ({ page }) => {
  const guest = await preview(page, '/teachers/preview-teacher', 'guest')
  await expect(page.getByRole('link', { name: 'התחברות להוספת דירוג', exact: true })).toHaveAttribute('href', /review%3D1/)
  expect(guest.reads.some(url => url.pathname === '/api/reviews/me')).toBe(false)
  expect(guest.unexpected).toEqual([])
  const teacher = await preview(page, '/teachers/preview-teacher', 'teacher')
  await expect(page.getByRole('button', { name: 'הוספת דירוג', exact: true })).toHaveCount(0)
  if ((page.viewportSize()?.width ?? 1200) < 768) await page.getByRole('button', { name: 'פתיחת תפריט', exact: true }).click()
  await page.getByRole('link', { name: 'לוח הבקרה למורה', exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: 'לוח הבקרה', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'קביעת שיעור חדש', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'קביעת שיעור נוסף', exact: true })).toBeVisible()
  expect(teacher.writes).toEqual([])
  expect(teacher.errors).toEqual([])
  expect(teacher.unexpected).toEqual([])
})
