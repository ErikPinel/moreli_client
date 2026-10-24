import { expect, test } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import type { ManualAccessPaymentDto, SupportTicketDto } from '../src/types/api'

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.route('https://noted-caribou-6267.clerk.accounts.dev/**', async route => {
    try {
      const response = await route.fetch({ timeout: 20_000 })
      await route.fulfill({ response })
    } catch {
      if (!page.isClosed()) await route.abort().catch(() => {})
    }
  })
})

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })

test('homepage wordmarks keep their niqqud and orange suffix at every breakpoint', async ({ page }) => {
  await page.route('**/api/teachers?**', route => route.fulfill({ json: {
    items: [], page: 1, limit: 5, hasMore: false, meta: { total: 0, pageCount: 0 },
  } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'מורה פרטי שמתאים לכם', exact: true })).toBeVisible()
  await expect(page.locator('.home-hero__sticky')).toHaveText(/השיעור הראשון\s*במרחק של קליק/)
  await expect(page.getByRole('form', { name: 'איזה מורה אתם מחפשים?', exact: true })).toBeVisible()
  await expect(page.locator('#how-it-works')).toContainText('אחרי אישור המורה תקבלו פרטי קשר')
  await expect(page.locator('.teacher-acquisition__benefits')).toContainText('התלמיד החדש הראשון ללא עלות')

  const wordmarks = page.locator('.brand-name')
  await expect(wordmarks).toHaveCount(4)
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('heading', { name: 'איזה מורה אתם מחפשים?', exact: true })).toBeVisible()
    for (const wordmark of await wordmarks.all()) {
      await expect(wordmark).toHaveText('מוֹרֶהלִי')
      await expect(wordmark).toHaveCSS('color', 'rgb(12, 36, 79)')
      await expect(wordmark).toHaveCSS('direction', 'rtl')
      await expect(wordmark).toHaveCSS('white-space', 'nowrap')
      await expect(wordmark.locator('.brand-name__suffix')).toHaveText('לִי')
      await expect(wordmark.locator('.brand-name__suffix')).toHaveCSS('color', 'rgb(255, 90, 10)')
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const geometry = await page.locator('.hero-search__submit').boundingBox()
    expect(geometry?.width).toBeGreaterThanOrEqual(44)
    expect(geometry?.height).toBeGreaterThanOrEqual(44)
  }
})

test('public navigation uses consistent labels on desktop and mobile', async ({ page }, testInfo) => {
  await page.route('**/api/teachers?**', route => route.fulfill({ json: {
    items: [], page: 1, limit: 5, hasMore: false, meta: { total: 0, pageCount: 0 },
  } }))
  await page.goto('/')
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'פתיחת תפריט' }).click()
  }
  const navigation = page.getByRole('navigation', {
    name: testInfo.project.name === 'mobile' ? 'ניווט למובייל' : 'ניווט ראשי', exact: true,
  })
  for (const [name, href] of [['חיפוש מורים', '/teachers'], ['איך זה עובד', '/#how-it-works'], ['למורים', '/teach']]) {
    await expect(navigation.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
  }
  const actions = testInfo.project.name === 'mobile' ? navigation : page.locator('.site-actions')
  await expect(actions.getByRole('link', { name: 'הרשמה לתלמידים', exact: true })).toHaveAttribute('href', '/signup')
  await expect(actions.getByRole('link', { name: 'הצטרפות כמורים', exact: true })).toHaveAttribute('href', '/teach')
  await navigation.getByRole('link', { name: 'חיפוש מורים', exact: true }).click()
  await expect(page).toHaveURL(/\/teachers$/)
})

test('public pages have a main landmark, working navigation and no horizontal overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.name))
  for (const path of ['/', '/teachers', '/teach', '/support', '/teacher-access-terms', '/does-not-exist']) {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('#main-content')).toHaveCount(1)
  }
  expect(errors).toEqual([])
})

test('the teach page explains the shared account and sends visitors to sign up first', async ({ page }) => {
  await page.goto('/teach')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('מאותו החשבון')
  await expect(page.getByRole('heading', { name: 'שני מצבים, חשבון אחד' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'הרשמה ופתיחת פרופיל מורה' }).first()).toHaveAttribute('href', '/signup?redirect=%2Fteach%2Fstart')
  await expect(page.getByRole('link', { name: 'כבר רשומים? התחברות' }).first()).toHaveAttribute('href', '/login?redirect=%2Fteach%2Fstart')
  await page.goto('/teach/start')
  await expect(page).toHaveURL(/\/login/)
})

test('public support offers real contacts and requires authentication for private tickets', async ({ page }) => {
  await page.goto('/support')
  await expect(page.locator('main a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:erik.zusin@gmail.com')
  await expect(page.locator('main a[href^="tel:"]')).toHaveAttribute('href', 'tel:0503939008')
  await page.getByRole('link', { name: 'כניסה לחשבון', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fsupport/)
})

test('protected pages return guests to sign-in instead of exposing account controls', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.Clerk?.loaded), undefined, { timeout: 35_000 })
  for (const path of ['/student/inquiries', '/teacher/access', '/admin']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('main')).toBeVisible()
  }
})

test('directory reports an API failure and offers a working retry', async ({ page }) => {
  let fail = true
  await page.route('**/api/teachers?**', async route => {
    if (fail) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Controlled browser acceptance failure' }) })
    else await route.continue()
  })
  await page.goto('/teachers')
  const retry = page.getByRole('button', { name: /ניסיון נוסף|נסו שוב/ })
  await expect(retry).toBeVisible({ timeout: 25_000 })
  await expect(page.locator('.directory-context')).toContainText('ספירת המורים אינה זמינה כרגע')
  await expect(page.locator('.directory-context')).not.toContainText('0 מורים מתאימים')
  fail = false
  await retry.click()
  await expect(retry).not.toBeVisible()
  await expect(page.locator('.teacher-result-card, .teacher-result, .teacher-results article').first()).toBeVisible()
})

test('mobile menu and skip link are keyboard-accessible', async ({ page }, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'פתיחת תפריט' }).click()
    await expect(page.getByRole('navigation', { name: 'ניווט למובייל' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation', { name: 'ניווט למובייל' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'פתיחת תפריט' })).toBeFocused()
  }
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'דילוג לתוכן' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('auth service failure has recovery actions instead of an endless loading screen', async ({ page }) => {
  await page.route('**/npm/@clerk/clerk-js*/**', route => route.abort())
  await page.goto('/student/inquiries')
  await expect(page.getByRole('heading', { name: 'לא הצלחנו לחבר את החשבון' })).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('button', { name: 'ניסיון נוסף' })).toBeVisible()
  await page.getByRole('link', { name: 'חזרה לדף הבית' }).click()
  await expect(page.getByRole('heading', { name: 'מורה פרטי שמתאים לכם', exact: true })).toBeVisible()
})

test('unverified email recovery sends a code, handles failures and verifies before continuing', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.name))
  const source = await (await page.request.get('/src/auth/EmailVerificationForm.tsx')).text()
  const main = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (content: string, filename: string) => {
    const paths = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1])
    const path = paths.find(candidate => candidate.includes(`/${filename}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${filename}`)
    return path
  }
  const modules = { react: dependency(source, 'react'), dom: dependency(main, 'react-dom_client') }
  await page.route('http://localhost:5176/email-verification-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><main id="preview" class="page-shell auth-recovery"><div class="auth-recovery__content"><h1>נדרש אימות כתובת המייל</h1><p>יש להוסיף ולאמת כתובת מייל ראשית בחשבון כדי להמשיך.</p><div id="form"></div><div class="auth-recovery__secondary"><button data-variant="ghost">ניהול החשבון ואימות המייל</button><button data-variant="ghost">אימתתי את המייל, בדיקה מחדש</button><button data-variant="ghost">התנתקות</button></div></div></main></body></html>' }))
  await page.goto('/email-verification-preview')
  await expect(page.getByRole('heading', { name: 'נדרש אימות כתובת המייל' })).toBeVisible()
  await page.evaluate(async (modules) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, form] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom),
      import('/src/auth/EmailVerificationForm.tsx'),
    ])
    const state = { sends: [] as unknown[], attempts: [] as string[], continued: 0, failSend: true }
    Object.assign(window, { verificationPreview: state })
    const email = {
      emailAddress: 'admin@example.com',
      prepareVerification: async (options: unknown) => {
        state.sends.push(options)
        if (state.failSend) throw new Error('Controlled sending failure')
      },
      attemptVerification: async ({ code }: { code: string }) => {
        state.attempts.push(code)
        if (code !== '123456') throw new Error('Controlled invalid code')
        return { verification: { status: 'verified' } }
      },
    }
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    ReactDOM.createRoot(document.getElementById('form')!).render(React.createElement(form.EmailVerificationForm, {
      email, onVerified: async () => { state.continued += 1 },
    }))
  }, modules)
  const form = page.getByRole('region', { name: 'אימות כתובת המייל' })
  await expect(form).toContainText('admin@example.com')
  await expect(form.getByRole('textbox', { name: 'קוד אימות' })).toHaveCount(0)
  const send = form.getByRole('button', { name: 'שליחת קוד אימות למייל' })
  await expect(send).toHaveAttribute('data-variant', 'default')
  await expect(send).toHaveCSS('background-color', 'rgb(201, 67, 0)')
  await expect(form.locator('.verification-flow__cue')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(form.locator('.verification-flow__cue')).toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.screenshot({ path: testInfo.outputPath('email-verification-send.png'), fullPage: true })
  await send.click()
  await expect(form.getByRole('alert')).toContainText('לא הצלחנו לשלוח קוד אימות')
  await expect(form.getByRole('status')).toHaveCount(0)
  await page.evaluate(() => { (window as unknown as { verificationPreview: { failSend: boolean } }).verificationPreview.failSend = false })
  await page.clock.install()
  await form.getByRole('button', { name: 'שליחת קוד אימות למייל' }).click()
  await expect(form.getByRole('status')).toBeVisible()
  const resend = form.getByRole('button', { name: 'שליחת קוד חדש' })
  await expect(resend).toBeDisabled()
  await expect(resend).toHaveAttribute('data-variant', 'link')
  await expect(form.locator('.verification-flow__cue')).toHaveCount(0)
  const input = form.getByRole('textbox', { name: 'קוד אימות' })
  await expect(input).toBeFocused()
  const verify = form.getByRole('button', { name: 'אימות והמשך' })
  await expect(verify).toBeDisabled()
  await input.fill('654321')
  await verify.click()
  await expect(form.getByRole('alert')).toContainText('הקוד אינו תקין')
  expect(await page.evaluate(() => (window as unknown as { verificationPreview: { continued: number } }).verificationPreview.continued)).toBe(0)
  await page.clock.fastForward(60_000)
  await expect(resend).toBeEnabled()
  await resend.click()
  await expect(input).toHaveValue('')
  await expect(form.getByRole('alert')).toHaveCount(0)
  await input.fill('123456')
  await verify.click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { verificationPreview: { continued: number } }).verificationPreview.continued)).toBe(1)
  await expect(input).not.toHaveAttribute('aria-invalid')
  const calls = await page.evaluate(() => (window as unknown as { verificationPreview: { sends: unknown[]; attempts: string[] } }).verificationPreview)
  expect(calls.sends).toEqual(Array(3).fill({ strategy: 'email_code' }))
  expect(calls.attempts).toEqual(['654321', '123456'])
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('email-verification.png'), fullPage: true })
})

test('payment email deep link shows review details and requires explicit admin confirmation', async ({ page }, testInfo) => {
  const payment = {
    id: 'payment-review-preview', status: 'pending', amount_ils: 60, reference: 'BIT-REVIEW-123',
    support_ticket_id: 'ticket-review-preview',
    created_at: '2026-10-22T19:48:19Z', reviewed_at: null, review_note: null, period_end_at: null,
    teacher: { id: 'preview-teacher', slug: 'preview-teacher', profile: { first_name: 'Review', last_name: 'Teacher', contact_email: 'teacher@example.com', phone: '0500000000' } },
  }
  const decisions: unknown[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.name))
  await page.route('http://localhost:5146/api/**', async route => {
    const request = route.request()
    const headers = { 'access-control-allow-origin': 'http://localhost:5176', 'access-control-allow-methods': 'GET,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }
    if (request.method() === 'OPTIONS') await route.fulfill({ status: 204, headers })
    else if (request.method() === 'PATCH' && request.url().endsWith(`/admin/access-payments/${payment.id}`)) {
      decisions.push(request.postDataJSON())
      await route.fulfill({ headers, json: { ...payment, status: 'approved' } })
    } else if (request.method() === 'GET') {
      await route.fulfill({ headers, json: { items: request.url().includes('/admin/access-payments?') ? [payment] : [], page: 1, limit: 10, hasMore: false } })
    } else await route.abort()
  })
  const panelSource = await (await page.request.get('/src/features/account/AdminEngagementPanel.tsx')).text()
  const mainSource = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (source: string, filename: string) => {
    const paths = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1])
    const path = paths.find(candidate => candidate.includes(`/${filename}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${filename}`)
    return path
  }
  const modules = {
    react: dependency(panelSource, 'react'), dom: dependency(mainSource, 'react-dom_client'),
    query: dependency(panelSource, '@tanstack_react-query'), router: dependency(panelSource, 'react-router-dom'),
  }
  await page.route('http://localhost:5176/payment-review-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html dir="rtl" lang="he"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><main id="preview" class="page-shell py-8"></main></body></html>' }))
  await page.goto('/payment-review-preview')
  await page.evaluate(async ({ modules, paymentId }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, panel] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom),
      import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router),
      import('/src/features/account/AdminEngagementPanel.tsx'),
    ])
    const queryClient = new query.QueryClient({ defaultOptions: { queries: { retry: false } } })
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    ReactDOM.createRoot(document.getElementById('preview')!).render(React.createElement(query.QueryClientProvider, { client: queryClient },
      React.createElement(router.MemoryRouter, { initialEntries: [`/admin/payments?payment=${paymentId}#payments`] }, React.createElement(panel.AdminEngagementPanel))))
  }, { modules, paymentId: payment.id })
  const review = page.getByRole('article', { name: 'בדיקת דיווח תשלום' })
  await expect(review).toBeFocused()
  for (const detail of ['Review Teacher', 'teacher@example.com', '0500000000', 'BIT-REVIEW-123', '22:48:19', payment.id, '60 ₪']) {
    await expect(review).toContainText(detail)
  }
  await expect(review.getByRole('link', { name: 'פרופיל המורה' })).toHaveAttribute('href', '/teachers/preview-teacher')
  await expect(review.getByRole('link', { name: 'צפייה בפניית התמיכה' })).toHaveAttribute('href', `/admin/support?ticket=${payment.support_ticket_id}#support`)
  await expect(review.locator(`a[href="/admin/payments?payment=${payment.id}#payments"]`)).toHaveCount(0)
  const approve = review.getByRole('button', { name: 'אישור חודש גישה' })
  const reject = review.getByRole('button', { name: 'דחיית הדיווח' })
  await expect(approve).toBeDisabled()
  await expect(reject).toBeDisabled()
  expect(decisions).toEqual([])
  await review.getByRole('checkbox').check()
  await approve.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(decisions).toEqual([])
  await page.getByRole('button', { name: 'אישור ההחלטה' }).click()
  await expect.poll(() => decisions.length).toBe(1)
  expect(decisions[0]).toEqual({ approve: true, note: '' })
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await review.getByRole('textbox').fill('לא נמצא תשלום מתאים ב-Bit')
  await reject.click()
  await expect(page.getByRole('dialog')).toContainText('פניות תלמידים לא יידחו')
  await expect(page.getByRole('dialog')).toContainText('לא נמצא תשלום מתאים ב-Bit')
  expect(decisions).toHaveLength(1)
  await page.getByRole('button', { name: 'אישור ההחלטה' }).click()
  await expect.poll(() => decisions.length).toBe(2)
  expect(decisions[1]).toEqual({ approve: false, note: 'לא נמצא תשלום מתאים ב-Bit' })
  await expect(page.getByRole('status')).toContainText('דיווח התשלום נדחה')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('payment-review.png'), fullPage: true })
})

for (const scenario of ['pending', 'appeal-approved', 'appeal-rejected', 'missing-profile', 'missing-field', 'no-report', 'different-case', 'unlinked-report'] as const) {
test(`billing support ticket ${scenario} handles payment review without losing prior decisions`, async ({ page }, testInfo) => {
  const teacherId = 'teacher-billing-preview'
  const appealing = scenario.startsWith('appeal')
  const payment: ManualAccessPaymentDto = { id: 'payment-billing-preview', status: appealing ? 'rejected' : 'pending', amount_ils: 60, reference: 'BIT-TICKET-456', teacher_id: teacherId, created_at: '2026-10-23T12:52:45Z', reviewed_at: appealing ? '2026-10-23T12:55:00Z' : null, review_note: appealing ? 'האסמכתא לא נמצאה בבדיקה הראשונה' : null, period_start_at: null, period_end_at: null, reconsideration_of: null, support_ticket_id: scenario === 'different-case' ? 'canonical-billing-case' : scenario === 'unlinked-report' ? null : 'ticket-billing-preview', teacher: { id: teacherId, slug: 'billing-teacher', profile: { first_name: 'Billing', last_name: 'Teacher', contact_email: 'billing@example.com', phone: '0500000001' } } }
  const ticket: SupportTicketDto = { id: 'ticket-billing-preview', user_id: 'user-billing-preview', category: 'billing', subject: 'שילמתי ואין לי גישה', message: 'העברתי 60 ש״ח ב-Bit ועדיין לא ניתן לאשר תלמידים', status: 'open', created_at: '2026-10-23T12:52:45Z', updated_at: '2026-10-23T12:52:45Z', teacher_id: null, inquiry_id: null, workflow: scenario === 'different-case' || scenario === 'no-report' ? null : 'payment', payment_id: scenario === 'different-case' || scenario === 'no-report' ? null : payment.id, messages: [], requester_teacher: { id: teacherId, slug: 'billing-teacher' } }
  let reports = scenario === 'no-report' ? [] : [payment]
  let ticketReads = 0
  const paymentQueries: string[] = []
  const decisions: unknown[] = []
  const reopenRequests: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('http://localhost:5146/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')
    const headers = { 'access-control-allow-origin': 'http://localhost:5176', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() === 'POST' && path === `/admin/support-tickets/${ticket.id}/payments/${payment.id}/reopen`) {
      reopenRequests.push(path)
      const reopened: ManualAccessPaymentDto = { ...payment, id: 'reconsidered-payment-preview', status: 'pending', created_at: '2026-10-23T13:00:00Z', reviewed_at: null, review_note: null, reconsideration_of: payment.id, support_ticket_id: ticket.id }
      reports = [reopened, payment]
      ticket.payment_id = reopened.id
      ticket.status = 'in_progress'
      return route.fulfill({ headers, json: reopened })
    }
    if (request.method() === 'PATCH' && reports.some(report => path === `/admin/access-payments/${report.id}`)) {
      const decision = request.postDataJSON()
      decisions.push(decision)
      reports = reports.map<ManualAccessPaymentDto>(report => path === `/admin/access-payments/${report.id}` ? { ...report, status: decision.approve ? 'approved' : 'rejected', reviewed_at: '2026-10-23T13:05:00Z', review_note: decision.note } : report)
      ticket.status = decision.approve ? 'resolved' : 'waiting_customer'
      ticket.messages!.push({ id: 'automatic-decision', author_role: 'system', body: decision.approve ? 'התשלום אושר. הפנייה נסגרה אוטומטית.' : `דיווח התשלום לא אושר. הסיבה: ${decision.note}`, created_at: '2026-10-23T13:05:00Z' })
      return route.fulfill({ headers, json: reports.find(report => path === `/admin/access-payments/${report.id}`) })
    }
    if (request.method() !== 'GET') return route.abort()
    const pagination = (items: unknown[]) => ({ items, page: 1, limit: 10, hasMore: false })
    if (path === '/admin/access-payments') {
      paymentQueries.push(url.search)
      return route.fulfill({ headers, json: pagination(reports.filter(report => !url.searchParams.has('paymentId') || url.searchParams.get('paymentId') === report.id)) })
    }
    if (path === '/admin/support-tickets') return route.fulfill({ headers, json: pagination(url.searchParams.get('view') === 'actionable' && !['open', 'in_progress'].includes(ticket.status) ? [] : [ticket]) })
    if (path === `/admin/support-tickets/${ticket.id}`) {
      ticketReads++
      const { requester_teacher, ...withoutRequester } = ticket
      return route.fulfill({ headers, json: scenario === 'missing-field' && ticketReads === 1 ? withoutRequester : { ...ticket, requester_teacher: scenario === 'missing-profile' ? null : requester_teacher } })
    }
    return route.fulfill({ headers, status: 404, json: null })
  })
  const panelSource = await (await page.request.get('/src/features/account/AdminEngagementPanel.tsx')).text()
  const mainSource = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (source: string, name: string) => {
    const path = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]).find(value => value.includes(`/${name}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${name}`)
    return path
  }
  const modules = { react: dependency(panelSource, 'react'), dom: dependency(mainSource, 'react-dom_client'), query: dependency(panelSource, '@tanstack_react-query'), router: dependency(panelSource, 'react-router-dom') }
  await page.route('http://localhost:5176/billing-ticket-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><main id="preview" class="page-shell py-8"></main></body></html>' }))
  await page.goto('/billing-ticket-preview')
  await page.evaluate(async ({ modules, ticketId }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, panel] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom), import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router),
      import('/src/features/account/AdminEngagementPanel.tsx'),
    ])
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    const client = new query.QueryClient({ defaultOptions: { queries: { retry: false } } })
    ReactDOM.createRoot(document.getElementById('preview')!).render(React.createElement(query.QueryClientProvider, { client },
      React.createElement(router.MemoryRouter, { initialEntries: [`/admin/support?ticket=${ticketId}#support`] }, React.createElement(panel.AdminSupportPage))))
  }, { modules, ticketId: ticket.id })

  await expect(page.getByRole('link', { name: /כולל בדיקת תשלום/ })).toBeVisible()
  const panel = page.getByRole('region', { name: 'בדיקת התשלום של הפונה' })
  await expect(panel).toBeVisible()
  if (scenario === 'missing-profile') {
    await expect(panel).toContainText('לא נמצא פרופיל מורה המקושר לחשבון ששלח את הפנייה')
    expect(paymentQueries).toEqual([])
    expect(errors).toEqual([])
    return
  }
  if (scenario === 'missing-field') {
    await expect(panel).toContainText('פרטי המורה חסרים בתשובת השרת')
    await expect(panel).not.toContainText('הפונה אינו מורה')
    expect(paymentQueries).toEqual([])
    await panel.getByRole('button', { name: 'טעינת פרטי הפונה מחדש' }).click()
    await expect(panel.getByRole('article', { name: 'בדיקת דיווח תשלום' })).toContainText('Billing Teacher')
    expect(ticketReads).toBe(2)
    expect(errors).toEqual([])
    return
  }
  await expect.poll(() => paymentQueries.length).toBeGreaterThan(0)
  expect(paymentQueries[0]).toContain(`teacherId=${teacherId}`)
  if (scenario === 'different-case' || scenario === 'unlinked-report') {
    await expect(panel).toContainText(scenario === 'different-case' ? 'דיווח התשלום מנוהל בפנייה המקושרת שלו' : 'דיווח ממתין אינו מקושר לפניית בדיקה')
    await expect(panel.getByRole('button', { name: 'אישור חודש גישה' })).toHaveCount(0)
    if (scenario === 'different-case') await expect(panel.getByRole('link', { name: 'מעבר לפניית בדיקת התשלום' })).toHaveAttribute('href', '/admin/support?ticket=canonical-billing-case#support')
    expect(decisions).toEqual([])
    expect(errors).toEqual([])
    return
  }
  if (scenario === 'no-report') {
    await expect(panel).toContainText('לא נמצא דיווח תשלום בחשבון המורה')
    await expect(panel.getByRole('button', { name: 'פתיחת בדיקה מחדש' })).toHaveCount(0)
    await panel.getByRole('button', { name: 'הכנסת בקשה לשליחת דיווח' }).click()
    await expect(page.getByRole('textbox', { name: 'מענה למשתמש' })).toHaveValue(/אסמכתת/)
    expect(decisions).toEqual([])
    expect(reopenRequests).toEqual([])
    expect(errors).toEqual([])
    return
  }
  const review = panel.getByRole('article', { name: 'בדיקת דיווח תשלום' })
  for (const detail of ['Billing Teacher', 'BIT-TICKET-456', '60 ₪']) await expect(review).toContainText(detail)
  if (appealing) {
    await expect(review).toContainText('האסמכתא לא נמצאה בבדיקה הראשונה')
    await expect(review.getByRole('button', { name: 'אישור חודש גישה' })).toHaveCount(0)
    await panel.getByRole('button', { name: 'פתיחת בדיקה מחדש' }).click()
    await expect(page.getByRole('dialog')).toContainText('פעולה זו אינה מפעילה גישה')
    expect(reopenRequests).toEqual([])
    await page.getByRole('button', { name: 'פתיחת הדיווח לבדיקה' }).click()
    await expect(review).toContainText('בדיקה מחדש של אותה העברה')
    await expect(review.getByRole('link', { name: 'ההחלטה הקודמת' })).toHaveAttribute('href', `/admin/payments?payment=${payment.id}#payments`)
    await expect(review.locator(`a[href="/admin/support?ticket=${ticket.id}#support"]`)).toHaveCount(0)
    await expect(panel.locator(`a[href="/admin/history?source=payments&teacher=${teacherId}"]`)).toHaveCount(1)
    await expect(review.getByRole('link', { name: 'פתיחה במסך התשלומים' })).toHaveAttribute('href', '/admin/payments?payment=reconsidered-payment-preview#payments')
    expect(reopenRequests).toHaveLength(1)
    expect(decisions).toEqual([])
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('billing-appeal-pending.png'), fullPage: true })
  }
  await expect(review.getByRole('button', { name: 'אישור חודש גישה' })).toBeDisabled()
  const approve = scenario === 'appeal-approved'
  if (approve) {
    await review.getByRole('checkbox').check()
    await review.getByRole('button', { name: 'אישור חודש גישה' }).click()
  } else {
    await review.getByRole('textbox').fill('לא נמצאה העברה')
    await review.getByRole('button', { name: 'דחיית הדיווח' }).click()
  }
  await page.getByRole('button', { name: 'אישור ההחלטה' }).click()
  await expect.poll(() => decisions.length).toBe(1)
  expect(decisions[0]).toEqual({ approve, note: approve ? '' : 'לא נמצאה העברה' })
  await expect(panel.getByRole('status')).toContainText(approve ? 'התשלום אושר והגישה הופעלה' : 'דיווח התשלום נדחה')
  if (appealing) expect(reports.find(report => report.id === payment.id)).toMatchObject({ status: 'rejected', review_note: 'האסמכתא לא נמצאה בבדיקה הראשונה' })
  const reply = page.getByRole('textbox', { name: 'מענה למשתמש' })
  await expect(reply).toHaveValue('')
  await expect(page.getByRole('combobox', { name: 'מצב לאחר שליחת המענה' })).toHaveValue(approve ? 'resolved' : 'waiting_customer')
  await expect(page.locator('.support-message').filter({ hasText: 'עדכון אוטומטי של מורהלי' })).toContainText(approve ? 'הפנייה נסגרה אוטומטית' : 'הסיבה: לא נמצאה העברה')
  await expect(page.getByRole('link', { name: /כולל בדיקת תשלום/ })).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('billing-ticket-review.png'), fullPage: true })
})
}

test('admin workspace isolates queues, preserves email links and filters delivery history', async ({ page }, testInfo) => {
  const paymentId = 'payment-admin-preview'
  const teacherId = 'teacher-admin-preview'
  const inquiryId = '00000000-0000-4000-8000-000000000001'
  const payment = { id: paymentId, status: 'pending', amount_ils: 60, reference: 'BIT-ADMIN-123', created_at: '2026-10-22T19:48:19Z', reviewed_at: null, review_note: null, period_end_at: null, teacher: { id: teacherId, slug: 'preview-teacher', profile: { first_name: 'Review', last_name: 'Teacher', contact_email: 'teacher@example.com', phone: '0500000000' } } }
  const teacher = { id: teacherId, headline: 'מורה לבדיקה', bio: 'פרופיל לבדיקה בתצוגה מבודדת', profile_status: 'pending', review_reason: null, avatarUrl: null, profile: payment.teacher.profile, subjects: [], levels: [] }
  const ticket = { id: 'ticket-admin-preview', subject: 'בקשת תמיכה לבדיקה', category: 'billing', status: 'open', updated_at: '2026-10-22T19:48:19Z' }
  const deliveries = Array.from({ length: 20 }, (_, index) => ({ id: `email-preview-${String(index + 1).padStart(3, '0')}`, event_type: index === 0 ? 'support.created' : 'billing.requested', status: index === 0 ? 'dead' : index < 3 ? 'sent' : 'pending', attempts: index === 0 ? 5 : 1, created_at: '2026-10-22T19:48:19Z', last_error: index === 0 ? 'Synthetic provider error' : null, provider: 'resend', provider_status: index === 1 ? 'accepted' : index === 2 ? 'delivered' : null }))
  const reads: string[] = []
  const writes: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('http://localhost:5146/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api', '')
    const headers = { 'access-control-allow-origin': 'http://localhost:5176', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${path}`)
      return route.fulfill({ headers, json: { processed: 1 } })
    }
    reads.push(path)
    const pagination = (items: unknown[]) => ({ items, page: 1, limit: 10, hasMore: false })
    const result = path === '/admin/access-payments' ? pagination([payment])
      : path === '/admin/teachers' ? pagination([teacher])
        : path === '/admin/reviews' ? pagination([])
          : path === '/admin/support-tickets' ? pagination([ticket])
            : path === '/admin/email-delivery/configuration' ? { provider: 'resend', configured: true, testMode: false, webhookConfigured: true }
              : path === '/admin/email-delivery' ? deliveries
                : path === `/admin/inquiries/${inquiryId}` ? { id: inquiryId, status: 'pending', message: 'פנייה לבדיקה בלבד', lesson_status: null, student: { first_name: 'Preview', last_name: 'Student', contact_email: 'student@example.com' }, teacher: payment.teacher }
                  : null
    return route.fulfill({ headers, status: result === null ? 404 : 200, json: result })
  })
  const panelSource = await (await page.request.get('/src/features/account/AdminEngagementPanel.tsx')).text()
  const mainSource = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (source: string, name: string) => {
    const path = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]).find(value => value.includes(`/${name}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${name}`)
    return path
  }
  const modules = { react: dependency(panelSource, 'react'), dom: dependency(mainSource, 'react-dom_client'), query: dependency(panelSource, '@tanstack_react-query'), router: dependency(panelSource, 'react-router-dom') }
  await page.route('http://localhost:5176/admin-workspace-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><div id="preview"></div></body></html>' }))
  await page.goto('/admin-workspace-preview')
  await page.evaluate(async ({ modules, paymentId }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, panel, auth, layout, overview, moderation, emails] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom), import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router),
      import('/src/features/account/AdminEngagementPanel.tsx'), import('/src/auth/auth-context.ts'), import('/src/features/admin/AdminLayout.tsx'), import('/src/features/admin/AdminOverviewPage.tsx'), import('/src/pages/AdminPage.tsx'), import('/src/features/admin/AdminEmailPage.tsx'),
    ])
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    const create = React.createElement
    const memory = router.createMemoryRouter([{ path: '/admin', element: create(layout.AdminLayout), children: [
      { index: true, element: create(overview.AdminOverviewPage) },
      { path: 'payments', element: create(panel.AdminPaymentsPage) },
      { path: 'onboarding', element: create(moderation.AdminOnboardingPage) },
      { path: 'reviews', element: create(moderation.AdminReviewsPage) },
      { path: 'support', element: create(panel.AdminSupportPage) },
      { path: 'emails', element: create(emails.AdminEmailPage) },
      { path: 'activity', element: create(panel.AdminActivityPage) },
    ] }], { initialEntries: [`/admin?payment=${paymentId}&decision=approve#payments`] })
    Object.assign(window, { adminWorkspacePreview: { navigate: (to: string) => memory.navigate(to), location: () => memory.state.location } })
    const client = new query.QueryClient({ defaultOptions: { queries: { retry: false } } })
    const identity = { user: { id: 'mock-admin', firstName: 'Admin', lastName: 'Preview', imageUrl: '' }, profile: { first_name: 'Admin', last_name: 'Preview', contact_email: 'admin@example.com', role: 'admin' }, isLoading: false, signOut: async () => {} }
    ReactDOM.createRoot(document.getElementById('preview')!).render(create(query.QueryClientProvider, { client }, create(auth.AuthContext.Provider, { value: identity }, create(router.RouterProvider, { router: memory }))))
  }, { modules, paymentId })
  const navigation = page.getByRole('navigation', { name: 'ניווט ניהול' })
  const activePage = async (name: string) => { await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible(); await expect(navigation.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page') }
  const navigate = async (to: string) => page.evaluate(to => (window as unknown as { adminWorkspacePreview: { navigate: (to: string) => Promise<void> } }).adminWorkspacePreview.navigate(to), to)
  const location = () => page.evaluate(() => (window as unknown as { adminWorkspacePreview: { location: () => { pathname: string; search: string; hash: string } } }).adminWorkspacePreview.location())

  await activePage('תשלומים וגישה')
  await expect(page.getByRole('article', { name: 'בדיקת דיווח תשלום' })).toBeFocused()
  expect(await location()).toMatchObject({ pathname: '/admin/payments', search: `?payment=${paymentId}&decision=approve`, hash: '#payments' })
  expect(reads).toEqual(['/admin/access-payments'])
  expect(writes).toEqual([])
  await expect(page.getByRole('button', { name: 'אישור חודש גישה' })).toBeDisabled()
  const skip = page.getByRole('link', { name: 'דילוג לתוכן' })
  await expect(skip).toHaveCSS('clip-path', 'inset(50%)')
  await skip.focus()
  await expect(skip).toHaveCSS('transform', 'none')
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(skip).toHaveCSS('clip-path', 'inset(50%)')
  await page.screenshot({ path: testInfo.outputPath('admin-payments.png'), fullPage: true })

  await navigation.getByRole('link', { name: 'מסירת אימיילים' }).click()
  await activePage('מסירת אימיילים')
  const table = page.getByRole('table')
  await expect(table.getByRole('row')).toHaveCount(16)
  await expect(table).toContainText('נמסר לתיבה')
  await expect(table).toContainText('הספק קיבל')
  await expect(page.getByRole('article', { name: 'בדיקת דיווח תשלום' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('admin-emails.png'), fullPage: true })
  await page.getByRole('button', { name: 'העמוד הבא', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(6)
  await page.getByRole('combobox', { name: 'מצב', exact: true }).selectOption('dead')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('Synthetic provider error')
  await table.getByRole('button', { name: 'ניסיון נוסף' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(writes).toEqual([])
  await page.getByRole('button', { name: 'ביטול', exact: true }).click()
  await page.getByRole('combobox', { name: 'מצב', exact: true }).selectOption('')
  await page.getByRole('textbox', { name: 'חיפוש במסירות אימייל' }).fill('email-preview-020')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('email-preview-020')
  await page.getByRole('button', { name: 'עיבוד תור ידני' }).click()
  expect(writes).toEqual([])
  await page.getByRole('button', { name: 'ביטול', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()

  await navigation.getByRole('link', { name: 'תמיכה ודיווחים' }).click()
  await activePage('תמיכה ודיווחים')
  await expect(page.getByRole('link', { name: /בקשת תמיכה לבדיקה/ })).toContainText('תשלום וגישה · פתוחה')
  await navigation.getByRole('link', { name: 'הצטרפות מורים' }).click()
  await activePage('הצטרפות מורים')
  await expect(page.locator('#teachers')).toContainText('מורה לבדיקה')
  await navigate(`/admin?teacher=${teacherId}#teachers`)
  await expect.poll(async () => (await location()).pathname).toBe('/admin/onboarding')
  await expect(page.locator('#teachers article')).toBeFocused()
  await navigation.getByRole('link', { name: 'ביקורות ותגובות' }).click()
  await activePage('ביקורות ותגובות')
  await navigation.getByRole('link', { name: 'בירור פנייה ושיעור' }).click()
  await activePage('בירור פנייה ושיעור')
  expect(reads.some(path => path.startsWith('/admin/inquiries/'))).toBe(false)
  await page.getByRole('textbox', { name: 'מספר פנייה' }).fill(inquiryId)
  await page.getByRole('button', { name: 'חיפוש', exact: true }).click()
  await expect(page.locator('#activity')).toContainText('פנייה לבדיקה בלבד')
  await navigate('/admin#payments')
  await activePage('תשלומים וגישה')
  await navigation.getByRole('link', { name: 'סקירה כללית' }).click()
  await activePage('סקירה כללית')
  await expect(page.getByRole('link', { name: /Review Teacher דיווח Bit/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(writes).toEqual([])
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('admin-overview.png'), fullPage: true })
})

test('saved admin history and teacher rejection notification explain the exact payment decision', async ({ page }, testInfo) => {
  const teacherId = '00000000-0000-4000-8000-000000000001'
  const paymentId = '00000000-0000-4000-8000-000000000002'
  const reviewer = { id: '00000000-0000-4000-8000-000000000003', first_name: 'Admin', last_name: 'Reviewer', contact_email: 'reviewer@example.com' }
  const teacher = { id: teacherId, slug: 'preview-teacher', headline: 'מורה לבדיקה', profile: { first_name: 'Preview', last_name: 'Teacher', contact_email: 'teacher@example.com' } }
  const rejected = { id: paymentId, teacher_id: teacherId, status: 'rejected', amount_ils: 60, reference: 'BIT-HISTORY-001', created_at: '2026-10-21T08:00:00Z', reviewed_at: '2026-10-22T09:00:00Z', reviewed_by: reviewer.id, reviewer, review_note: 'לא נמצאה העברה התואמת לאסמכתא', period_start_at: null, period_end_at: null, teacher }
  const approved = { ...rejected, id: '00000000-0000-4000-8000-000000000004', reconsideration_of: paymentId, status: 'approved', created_at: '2026-10-23T08:00:00Z', reviewed_at: '2026-10-23T09:00:00Z', review_note: 'התשלום נבדק', period_start_at: '2026-10-23T09:00:00Z', period_end_at: '2026-11-23T09:00:00Z' }
  const profileEvent = { id: 'profile-history-preview', teacher_id: teacherId, actor_id: reviewer.id, actor: reviewer, teacher, previous_status: 'pending', next_status: 'draft', reason: 'יש להשלים את פרטי ההוראה', created_at: '2026-10-22T09:00:00Z' }
  let accessActive = true
  let freeContactUsed = true
  const writes: string[] = []
  const reads: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('http://localhost:5146/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')
    const headers = { 'access-control-allow-origin': 'http://localhost:5176', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() !== 'GET') { writes.push(path); return route.abort() }
    reads.push(path + url.search)
    const pageNumber = Number(url.searchParams.get('page') ?? '1')
    const paymentRows = url.searchParams.get('status') === 'approved' || pageNumber === 2 ? [approved] : [rejected]
    const result = path === '/admin/access-payments' ? { items: paymentRows, page: pageNumber, limit: 20, hasMore: pageNumber === 1 && !url.searchParams.has('status') && !url.searchParams.has('teacherId') }
      : path === '/admin/teacher-history' ? { items: [profileEvent], page: 1, limit: 20, hasMore: false }
        : path === '/teachers/me/access' ? { payments: [approved, rejected], active: accessActive, freeContactUsed, paidUntil: accessActive ? approved.period_end_at : null }
          : path === '/support/contact' ? { phone: '0500000000', email: 'support@example.com', monthlyPriceIls: 60, automaticPaymentsAvailable: false }
            : path === '/teachers/me' ? { ...teacher, profile_status: 'published' }
              : path === '/notifications' ? { items: [{ id: 'notification-preview', title: 'דיווח התשלום לא אושר', body: rejected.review_note, entity_type: 'payment', entity_id: paymentId, created_at: rejected.reviewed_at, read_at: null }], page: 1, limit: 20, hasMore: false }
                : { items: [], count: 0 }
    await route.fulfill({ headers, json: result })
  })

  const panelSource = await (await page.request.get('/src/features/account/AdminEngagementPanel.tsx')).text()
  const mainSource = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (source: string, filename: string) => {
    const path = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]).find(candidate => candidate.includes(`/${filename}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${filename}`)
    return path
  }
  const publishableKey = mainSource.match(/pk_test_[A-Za-z0-9=]+/)?.[0]
  if (!publishableKey) throw new Error('Missing public Clerk preview configuration')
  const modules = { react: dependency(panelSource, 'react'), dom: dependency(mainSource, 'react-dom_client'), query: dependency(panelSource, '@tanstack_react-query'), router: dependency(panelSource, 'react-router-dom'), clerk: dependency(mainSource, '@clerk_react') }
  await page.route('http://localhost:5176/payment-history-preview', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><div id="preview"></div></body></html>' }))
  const mount = async () => page.evaluate(async ({ modules, publishableKey }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, clerk, auth, layout, history, access, notifications] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom), import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router), import(/* @vite-ignore */ modules.clerk),
      import('/src/auth/auth-context.ts'), import('/src/features/admin/AdminLayout.tsx'), import('/src/features/admin/AdminHistoryPage.tsx'), import('/src/pages/TeacherAccessPage.tsx'), import('/src/pages/NotificationsPage.tsx'),
    ])
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    const create = React.createElement
    function PreviewIdentity() {
      const location = router.useLocation()
      const role = location.pathname.startsWith('/teacher') ? 'teacher' : 'admin'
      return create(auth.AuthContext.Provider, { value: { user: { id: 'mock-user', firstName: 'Preview', lastName: 'User', imageUrl: '' }, profile: { id: 'mock-profile', first_name: 'Preview', last_name: 'User', contact_email: 'preview@example.com', role }, isLoading: false, signOut: async () => {} } }, create(router.Outlet))
    }
    const memory = router.createMemoryRouter([{ element: create(PreviewIdentity), children: [
      { path: '/admin', element: create(layout.AdminLayout), children: [{ path: 'history', element: create(history.AdminHistoryPage) }] },
      { path: '/teacher/access', element: create(access.TeacherAccessPage) },
      { path: '/teacher/notifications', element: create(notifications.NotificationsPage) },
    ] }], { initialEntries: ['/admin/history?source=payments'] })
    Object.assign(window, { paymentHistoryPreview: { navigate: (to: string) => memory.navigate(to), location: () => memory.state.location } })
    const client = new query.QueryClient({ defaultOptions: { queries: { retry: false } } })
    Object.assign(window, { refreshTeacherAccessPreview: () => client.invalidateQueries({ queryKey: ['account', 'teacher-access'] }) })
    ReactDOM.createRoot(document.getElementById('preview')!).render(create(clerk.ClerkProvider, { publishableKey }, create(query.QueryClientProvider, { client }, create(router.RouterProvider, { router: memory }))))
  }, { modules, publishableKey })
  await page.goto('/payment-history-preview')
  await mount()
  await expect(page.getByRole('heading', { name: 'היסטוריית החלטות', exact: true })).toBeVisible()
  await expect(page.locator('.admin-history-list')).toContainText('Admin Reviewer')
  await expect(page.locator('.admin-history-list')).toContainText(rejected.review_note)
  await expect(page.locator('.admin-history-list')).toContainText('reviewer@example.com')
  await page.getByRole('button', { name: 'העמוד הבא', exact: true }).click()
  await expect(page.locator('.admin-history-list')).toContainText('תשלום אושר')
  await expect(page.locator('.admin-history-list')).toContainText('החלטה בבדיקה מחדש של אותה העברה')
  await expect(page.locator('.admin-history-list').getByRole('link', { name: 'ההחלטה הקודמת' })).toHaveAttribute('href', `/admin/payments?payment=${paymentId}#payments`)
  await page.getByRole('combobox', { name: 'החלטה', exact: true }).selectOption('rejected')
  await expect(page.locator('.admin-history-list')).toContainText('דיווח תשלום נדחה')
  await expect.poll(() => reads.some(path => path.includes('status=rejected'))).toBe(true)
  await page.getByRole('textbox', { name: 'מספר פרופיל מורה' }).fill(teacherId)
  await page.getByRole('button', { name: 'סינון לפי מורה' }).click()
  await expect.poll(() => reads.some(path => path.includes(`teacherId=${teacherId}`))).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('admin-payment-history.png'), fullPage: true })
  await page.getByRole('radio', { name: 'פרופילי מורים', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'פרופילי מורים', exact: true })).toBeChecked()
  await expect(page.locator('.admin-history-list')).toContainText('פרופיל הוחזר לתיקון')
  await expect(page.locator('.admin-history-list')).toContainText(profileEvent.reason)
  await expect(page.locator('.admin-history-list')).toContainText('Admin Reviewer')
  await page.reload()
  await mount()
  await expect(page.locator('.admin-history-list')).toContainText(rejected.review_note)
  const navigate = (to: string) => page.evaluate(to => (window as unknown as { paymentHistoryPreview: { navigate: (to: string) => Promise<void> } }).paymentHistoryPreview.navigate(to), to)
  await navigate('/teacher/notifications')
  await expect(page.getByRole('heading', { name: 'התראות', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'לפרטים ולפעולות', exact: true })).toHaveAttribute('href', `/teacher/access?payment=${paymentId}`)
  await page.getByRole('link', { name: 'לפרטים ולפעולות', exact: true }).click()
  const notice = page.getByRole('region', { name: 'דיווח התשלום לא אושר · מה קורה עכשיו?' })
  await expect(notice).toBeVisible()
  await expect(notice).toContainText(rejected.review_note)
  await expect(notice).toContainText('הגישה שכבר אושרה נשארת בתוקף')
  await expect(notice).toContainText('אין לשלם שוב')
  await expect(notice).toContainText('פניות תלמידים לא נדחות אוטומטית')
  await expect(notice.getByRole('link', { name: 'בירור התשלום עם התמיכה' })).toHaveAttribute('href', '/support?category=billing')
  await expect(page.getByRole('article', { name: 'דיווח תשלום' }).filter({ hasText: paymentId })).toBeFocused()
  const reconsidered = page.getByRole('article', { name: 'דיווח תשלום' }).filter({ hasText: approved.id })
  await expect(reconsidered).toContainText('בדיקה מחדש של אותה העברה')
  await expect(reconsidered.getByRole('link', { name: 'הדיווח הקודם' })).toHaveAttribute('href', `/teacher/access?payment=${paymentId}`)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('teacher-rejected-payment.png'), fullPage: true })
  const refreshAccess = () => page.evaluate(() => (window as unknown as { refreshTeacherAccessPreview: () => Promise<void> }).refreshTeacherAccessPreview())
  accessActive = false
  await refreshAccess()
  await expect(notice).toContainText('לקבלת תלמיד חדש נוסף עדיין נדרש אישור גישה')
  await expect(notice).not.toContainText('הגישה שכבר אושרה נשארת בתוקף')
  await page.screenshot({ path: testInfo.outputPath('teacher-rejected-without-access.png'), fullPage: true })
  freeContactUsed = false
  await refreshAccess()
  await expect(notice).toContainText('האפשרות לקבל תלמיד ראשון ללא עלות נשארת זמינה')
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})