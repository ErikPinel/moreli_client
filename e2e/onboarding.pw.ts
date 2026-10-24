import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { ProfileDto, TeacherOnboardingDto } from '../src/types/api'

const professions: Array<{ name_he: string; slug: string }> = JSON.parse(readFileSync(new URL('../src/data/professions.json', import.meta.url), 'utf8'))
const cityCatalog: Array<{ name_he: string; slug: string }> = JSON.parse(readFileSync(new URL('../src/data/cities.json', import.meta.url), 'utf8'))
const math = professions.find(item => item.name_he === 'מתמטיקה - הכל')!
const city = cityCatalog.find(item => item.name_he === 'פתח תקווה')!

async function preview(page: Page, options: { identity?: boolean; avatar?: boolean; existing?: boolean } = {}) {
  const profile: ProfileDto = {
    id: 'onboarding-preview', role: options.existing ? 'teacher' : 'student',
    first_name: options.identity ? 'דנה' : '', last_name: options.identity ? 'כהן' : '',
    phone: options.identity ? '0501234567' : '', contact_email: 'teacher@example.com',
    city_id: options.identity ? 1 : null, avatar_path: options.avatar ? 'preview/avatar.webp' : null,
  }
  const teacher: TeacherOnboardingDto = {
    id: 'preview-teacher', user_id: profile.id, slug: 'preview-teacher',
    profile, profile_status: 'draft', headline: '', bio: '', hourly_price: 0,
    years_experience: 0, teaches_online: true, teaches_in_person: false,
    subjects: [], service_areas: [], availability: [], availability_customized: false,
    currency: 'ILS', verification_status: 'unverified', published_at: null,
  }
  const writes: Array<{ path: string; body: Record<string, unknown> }> = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api', '')
    const headers = {
      'access-control-allow-origin': 'http://localhost:5176',
      'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path === '/subjects') return route.fulfill({ headers, json: [{ ...math, id: 1, parent_id: null, name_en: 'Math', sort_order: 0 }] })
    if (path === '/cities') return route.fulfill({ headers, json: [{ ...city, id: 1, name_en: 'Petah Tikva', latitude: null, longitude: null }] })
    if (path === '/notifications/unread-count') return route.fulfill({ headers, json: { count: 0 } })
    if (path === '/teachers/me') return route.fulfill({ headers, json: teacher })
    if (path === '/storage/read-url') return route.fulfill({ headers, json: { signedUrl: '/favicon.svg' } })
    if (request.method() === 'PUT' && path === '/teachers/me/profile') {
      writes.push({ path, body: request.postDataJSON() })
      return route.fulfill({ headers, json: teacher })
    }
    errors.push(`Unexpected request: ${request.method()} ${path}`)
    return route.fulfill({ headers, status: 400, json: { message: 'Unexpected onboarding preview request' } })
  })
  const source = await (await page.request.get('/src/pages/TeacherOnboardingPage.tsx')).text()
  const main = await (await page.request.get('/src/main.tsx')).text()
  const dependency = (content: string, name: string) => {
    const path = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]).find(path => path.includes(`/${name}.js`))
    if (!path) throw new Error(`Missing preview dependency: ${name}`)
    return path
  }
  const modules = {
    react: dependency(source, 'react'), dom: dependency(main, 'react-dom_client'),
    query: dependency(source, '@tanstack_react-query'), router: dependency(source, 'react-router-dom'),
  }
  await page.route('http://localhost:5176/onboarding-preview', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><div id="preview"></div></body></html>',
  }))
  await page.goto('/onboarding-preview')
  await page.evaluate(async ({ modules, profile, teacher, existing }) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    Object.assign(window, { $RefreshReg$: () => {}, $RefreshSig$: () => (type: unknown) => type, __vite_plugin_react_preamble_installed__: true })
    const [react, dom, query, router, auth, onboarding] = await Promise.all([
      import(/* @vite-ignore */ modules.react), import(/* @vite-ignore */ modules.dom),
      import(/* @vite-ignore */ modules.query), import(/* @vite-ignore */ modules.router),
      import('/src/auth/auth-context.ts'), import('/src/pages/TeacherOnboardingPage.tsx'),
    ])
    const React = react.default ?? react
    const ReactDOM = dom.default ?? dom
    const client = new query.QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['teacher-profile'], teacher)
    const component = React.createElement(existing ? onboarding.TeacherOnboardingPage : onboarding.TeachClaimPage)
    const routes = router.createMemoryRouter([{ path: '*', element: component }], { initialEntries: [existing ? '/teacher/onboarding' : '/teach/start'] })
    ReactDOM.createRoot(document.getElementById('preview')!).render(
      React.createElement(query.QueryClientProvider, { client },
        React.createElement(auth.AuthContext.Provider, { value: { user: null, profile, isLoading: false, signOut: async () => {} } },
          React.createElement(router.RouterProvider, { router: routes }))),
    )
  }, { modules, profile, teacher, existing: options.existing ?? false })
  await expect(page.getByRole('heading', { name: 'השלמת פרופיל המורה', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'שמירה ושליחה לבדיקה', exact: true })).toBeEnabled()
  return { writes, errors }
}

const step = (page: Page, index: number) => page.locator('.onboarding-step').nth(index)
const next = (page: Page, index: number) => step(page, index).getByRole('button', { name: 'המשך לשלב הבא', exact: true })

for (const existing of [false, true]) {
  test(`legal draft links open safely without losing unsaved teacher details: ${existing ? 'existing' : 'new'}`, async ({ page }) => {
    const { writes, errors } = await preview(page, { existing })
    await page.getByLabel('שם פרטי', { exact: true }).fill('טיוטה שלא נשלחה')
    const note = page.locator('.onboarding-legal-note')
    await expect(note).toContainText('אינם נוסח סופי')
    for (const [path, title] of [['/terms', 'תנאי שימוש'], ['/privacy', 'מדיניות פרטיות']]) {
      const link = note.locator(`a[href="${path}"]`)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link).toHaveAccessibleName(/נפתח בלשונית חדשה/)
      const popupPromise = page.waitForEvent('popup')
      await link.click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(new RegExp(`${path}$`))
      await expect(popup.getByRole('heading', { level: 1, name: new RegExp(`^${title} — `) })).toBeVisible()
      await popup.close()
      await expect(page).toHaveURL(/\/onboarding-preview$/)
      await expect(page.getByLabel('שם פרטי', { exact: true })).toHaveValue('טיוטה שלא נשלחה')
      await expect(page.getByRole('dialog', { name: 'לצאת בלי לשמור?', exact: true })).toHaveCount(0)
    }
    expect(writes).toEqual([])
    expect(errors).toEqual([])
  })
}

test('incomplete identity blocks headers, keyboard and Continue and highlights only invalid fields', async ({ page }, testInfo) => {
  const { writes, errors } = await preview(page)
  const firstName = page.getByLabel('שם פרטי', { exact: true })
  await expect(firstName).not.toHaveAttribute('aria-invalid')
  await firstName.focus()
  await page.getByLabel('שם משפחה', { exact: true }).focus()
  await expect(firstName).toHaveAttribute('aria-invalid', 'true')
  await expect(firstName).toHaveCSS('border-color', 'rgb(201, 54, 43)')
  await firstName.fill('דנה')
  await expect(firstName).not.toHaveAttribute('aria-invalid')
  await expect(page.getByText('יש למלא שם פרטי.', { exact: true })).toHaveCount(0)

  for (const index of [1, 2, 3]) {
    await expect(step(page, index).locator('summary')).toHaveAttribute('aria-disabled', 'true')
    await step(page, index).locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(step(page, index)).not.toHaveAttribute('open')
    await expect(step(page, 0)).toHaveAttribute('open', '')
  }
  await next(page, 0).click()
  await expect(step(page, 0)).toHaveAttribute('open', '')
  await expect(page.getByLabel('שם משפחה', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('טלפון', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  const cityInput = page.getByRole('combobox', { name: 'עיר מגורים', exact: true })
  await expect(cityInput).toHaveAttribute('aria-invalid', 'true')
  await expect(cityInput.locator('xpath=ancestor::div[contains(@class,"search-combobox__control")]')).toHaveCSS('border-color', 'rgb(201, 54, 43)')
  await expect(page.getByRole('group', { name: 'תמונת פרופיל', exact: true })).toHaveCSS('outline-color', 'rgb(201, 54, 43)')
  await expect(page.getByLabel('אימייל מאומת', { exact: true })).not.toHaveAttribute('aria-invalid')
  await page.screenshot({ path: testInfo.outputPath('onboarding-identity-errors.png'), fullPage: true })
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})

test('steps unlock sequentially, validate numeric limits and relock when earlier fields are cleared', async ({ page }) => {
  const { errors } = await preview(page, { identity: true, avatar: true })
  await expect(step(page, 1).locator('summary')).not.toHaveAttribute('aria-disabled')
  await next(page, 0).click()
  await expect(step(page, 1)).toHaveAttribute('open', '')
  await next(page, 1).click()
  for (const name of ['כותרת מקצועית', 'אודות', 'מחיר לשעה בשקלים', 'שנות ניסיון (0 למורים בתחילת הדרך)']) {
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute('aria-invalid', 'true')
  }
  await page.getByLabel('כותרת מקצועית', { exact: true }).fill('מורה למתמטיקה')
  await page.getByLabel('אודות', { exact: true }).fill('עזרה בלימודים והכנה למבחנים.')
  const price = page.getByLabel('מחיר לשעה בשקלים', { exact: true })
  const experience = page.getByLabel('שנות ניסיון (0 למורים בתחילת הדרך)', { exact: true })
  for (const value of ['0', '1.5', '100001']) {
    await price.fill(value)
    await expect(price).toHaveAttribute('aria-invalid', 'true')
  }
  await price.fill('100000')
  for (const value of ['-1', '0.5', '81']) {
    await experience.fill(value)
    await expect(experience).toHaveAttribute('aria-invalid', 'true')
  }
  await experience.fill('0')
  await page.getByRole('checkbox', { name: 'אונליין', exact: true }).uncheck()
  await next(page, 1).click()
  await expect(page.getByRole('group', { name: 'אופן הלימוד', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('checkbox', { name: 'פנים אל פנים', exact: true }).check()
  await next(page, 1).click()
  await expect(step(page, 2)).toHaveAttribute('open', '')
  await next(page, 2).click()
  const subjects = page.getByRole('combobox', { name: 'מקצועות ההוראה', exact: true })
  const areas = page.getByRole('combobox', { name: 'ערים שבהן מתקיימים שיעורים', exact: true })
  await expect(subjects).toHaveAttribute('aria-invalid', 'true')
  await expect(areas).toHaveAttribute('aria-invalid', 'true')
  await subjects.fill('מתמטיקה')
  await page.getByRole('option', { name: math.name_he, exact: true }).click()
  await areas.fill(city.name_he)
  await page.getByRole('option', { name: city.name_he, exact: true }).click()
  await expect(subjects).not.toHaveAttribute('aria-invalid')
  await expect(areas).not.toHaveAttribute('aria-invalid')
  await areas.press('Escape')
  await next(page, 2).click()
  await expect(step(page, 3)).toHaveAttribute('open', '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await step(page, 0).locator('summary').click()
  await page.getByLabel('שם פרטי', { exact: true }).fill('')
  await expect(step(page, 3).locator('summary')).toHaveAttribute('aria-disabled', 'true')
  await step(page, 3).locator('summary').focus()
  await page.keyboard.press('Space')
  await expect(step(page, 0)).toHaveAttribute('open', '')
  await expect(step(page, 3)).not.toHaveAttribute('open')
  expect(errors).toEqual([])
})

test('full submission marks consent and availability; valid corrections clear the errors', async ({ page }) => {
  const { writes, errors } = await preview(page, { identity: true, avatar: true })
  await next(page, 0).click()
  await page.getByLabel('כותרת מקצועית', { exact: true }).fill('מורה למתמטיקה')
  await page.getByLabel('אודות', { exact: true }).fill('עזרה בלימודים.')
  await page.getByLabel('מחיר לשעה בשקלים', { exact: true }).fill('120')
  await page.getByLabel('שנות ניסיון (0 למורים בתחילת הדרך)', { exact: true }).fill('0')
  await next(page, 1).click()
  await page.getByRole('combobox', { name: 'מקצועות ההוראה', exact: true }).fill('מתמטיקה')
  await page.getByRole('option', { name: math.name_he, exact: true }).click()
  await page.getByRole('combobox', { name: 'מקצועות ההוראה', exact: true }).press('Escape')
  await next(page, 2).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('שעת סיום', { exact: true }).first().selectOption('09:00')
  await page.getByRole('button', { name: 'שמירה ושליחה לבדיקה', exact: true }).click()
  const availability = page.getByRole('group', { name: 'חלונות זמינות', exact: true })
  await expect(availability).toHaveAttribute('aria-invalid', 'true')
  await expect(availability).toHaveCSS('outline-color', 'rgb(201, 54, 43)')
  const consent = page.locator('.onboarding-consent input')
  await expect(consent).toHaveAttribute('aria-invalid', 'true')
  await consent.check()
  await expect(consent).not.toHaveAttribute('aria-invalid')
  await page.getByLabel('שעת סיום', { exact: true }).first().selectOption('21:00')
  await expect(availability).not.toHaveAttribute('aria-invalid')
  while (await page.getByRole('button', { name: /^הסרת חלון/ }).count()) {
    await page.getByRole('button', { name: /^הסרת חלון/ }).first().click()
  }
  await expect(availability).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'הוספת חלון זמן', exact: true }).click()
  await expect(availability).not.toHaveAttribute('aria-invalid')
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})

test('an existing private draft can still save partial details without unlocking later steps', async ({ page }) => {
  const { writes, errors } = await preview(page, { existing: true })
  await page.getByLabel('שם פרטי', { exact: true }).fill('טיוטה')
  await page.getByRole('button', { name: 'שמירת טיוטה', exact: true }).click()
  await expect(page.getByText('הטיוטה נשמרה. היא פרטית ולא נשלחה לבדיקה.', { exact: true })).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(writes[0].body).toMatchObject({ firstName: 'טיוטה', submitForReview: false })
  await expect(step(page, 1).locator('summary')).toHaveAttribute('aria-disabled', 'true')
  expect(errors).toEqual([])
})
