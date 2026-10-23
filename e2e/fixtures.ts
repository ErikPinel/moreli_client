import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import type { SupabaseClient } from '../../backend/node_modules/@supabase/supabase-js'
import type { Database } from '../../backend/src/database/database.types'

const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const environment = parseEnv(readFileSync(fileURLToPath(new URL('../../backend/.env', import.meta.url)), 'utf8'))
const apiUrl = 'http://localhost:5146/api'
type Account = { clerkId: string; id: string; email: string }
type Run = {
  id: string
  db: SupabaseClient<Database>
  applicant: Account
  student: Account
  secondStudent: Account
  teacherAccount: Account
  admin: Account
  teacher: Database['public']['Tables']['teacher_profiles']['Row']
  form: Record<string, unknown>
}

async function clerkRequest(path: string, method: string, body?: unknown) {
  const response = await fetch('https://api.clerk.com/v1' + path, {
    method, headers: { Authorization: `Bearer ${environment.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Disposable Clerk account operation failed (${response.status})`)
  return response.json()
}

export async function preparePage(page: Page) {
  await setupClerkTestingToken({ page })
  const host = new URL(environment.CLERK_ISSUER ?? 'https://noted-caribou-6267.clerk.accounts.dev').hostname
  await page.route(`https://${host}/**`, async route => {
    try {
      const response = await route.fetch({ timeout: 20_000 })
      await route.fulfill({ response })
    } catch {
      if (!page.isClosed()) await route.abort().catch(() => {})
    }
  })
}

export async function signIn(page: Page, account: Account) {
  await page.goto('/')
  await clerk.loaded({ page })
  if (await page.evaluate(() => Boolean(window.Clerk.user))) {
    await clerk.signOut({ page })
    await page.goto('/')
  }
  await clerk.signIn({ page, emailAddress: account.email })
  await page.waitForFunction(() => Boolean(window.Clerk?.user), undefined, { polling: 100 })
}

export async function api<T = Record<string, unknown>>(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ apiUrl, method, path, body }) => {
    const token = await window.Clerk.session?.getToken()
    const response = await fetch(apiUrl + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, data: await response.json() }
  }, { apiUrl, method, path, body }) as Promise<{ status: number; data: T }>
}

export const test = base.extend<object, { run: Run }>({
  page: async ({ page }, provide) => {
    await preparePage(page)
    try { await provide(page) } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }) }
  },
  run: [async ({ browserName }, provide) => {
    if (browserName !== 'chromium') throw new Error('This acceptance suite currently requires Chromium')
    if (!environment.CLERK_SECRET_KEY?.startsWith('sk_test_') || (environment.RESEND_FROM_EMAIL && !environment.RESEND_FROM_EMAIL.endsWith('@resend.dev'))) throw new Error('Mutating browser acceptance requires development auth and paused real email delivery')
    const id = randomUUID().replaceAll('-', '')
    const db: SupabaseClient<Database> = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
    const accounts: Account[] = []
    const cleanupErrors: string[] = []
    let avatarPath: string | undefined
    try {
      async function account(label: string, admin = false): Promise<Account> {
        const email = `ux-${id}-${label}+clerk_test@example.com`
        const remote = await clerkRequest('/users', 'POST', { email_address: [email], first_name: 'UX', last_name: label, skip_password_requirement: true })
        const identity = await db.rpc('resolve_external_identity', { p_provider: 'clerk', p_subject: remote.id, p_first_name: 'UX', p_last_name: label })
        if (identity.error || !identity.data) { await clerkRequest(`/users/${remote.id}`, 'DELETE'); throw new Error('Disposable profile resolution failed') }
        const created = { clerkId: remote.id as string, id: identity.data, email }
        accounts.push(created)
        const updated = await db.from('profiles').update({ contact_email: email, phone: '0500000000', ...(admin ? { role: 'admin' as const } : {}) }).eq('id', created.id)
        if (updated.error) throw new Error('Disposable profile initialization failed')
        return created
      }
      const admin = await account('admin', true)
      const teacherAccount = await account('teacher')
      const student = await account('student')
      const secondStudent = await account('second')
      const applicant = await account('applicant')
      const subjects = await db.from('subjects').select('slug').eq('is_active', true).order('id').limit(1).single()
      const cities = await db.from('cities').select('slug').eq('is_active', true).order('id').limit(1).single()
      const levels = await db.from('levels').select('id').order('id').limit(1).single()
      if (!subjects.data || !cities.data || !levels.data) throw new Error('Acceptance requires existing catalogs')
      avatarPath = `${teacherAccount.id}/ux-${id}.png`
      const uploaded = await db.storage.from('teacher-avatars').upload(avatarPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4h8AAAAASUVORK5CYII=', 'base64'), { contentType: 'image/png' })
      if (uploaded.error) throw new Error('Disposable avatar upload failed')
      const form = { acceptTerms: true, firstName: 'UX', lastName: 'teacher', phone: '0500000000', citySlug: cities.data.slug, avatarPath, headline: `מורה לבדיקת קבלה ${id.slice(0, 6)}`, bio: 'פרופיל זמני לבדיקת חוויית המשתמש. נמחק בסיום הבדיקה.', hourlyPrice: 120, yearsExperience: 5, teachesOnline: true, teachesInPerson: false, subjectSlugs: [subjects.data.slug], levelIds: [levels.data.id], citySlugs: [], slots: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '21:00', timezone: 'Asia/Jerusalem', isActive: true })) }
      const submitted = await db.rpc('submit_teacher_onboarding', { p_user_id: teacherAccount.id, p_form: form })
      if (submitted.error || !submitted.data?.[0]) throw new Error('Disposable teacher onboarding failed')
      await provide({ id, db, admin, teacherAccount, student, secondStudent, applicant, teacher: submitted.data[0], form })
    } finally {
      const ids = accounts.map(account => account.id)
      if (avatarPath) await db.storage.from('teacher-avatars').remove([avatarPath])
      if (ids.length) {
        const teachers = await db.from('teacher_profiles').select('id').in('user_id', ids)
        const teacherIds = teachers.data?.map(teacher => teacher.id) ?? []
        const inquiries = await db.from('inquiries').select('id').in('student_id', ids)
        const tickets = await db.from('support_tickets').select('id').in('user_id', ids)
        const reviews = await db.from('reviews').select('id').in('student_id', ids)
        const payments = teacherIds.length ? await db.from('teacher_access_payments').select('id').in('teacher_id', teacherIds) : { data: [], error: null }
        if ([teachers, inquiries, tickets, reviews, payments].some(result => result.error)) cleanupErrors.push('Unable to identify disposable records for cleanup')
        const entityIds = [...ids, ...teacherIds, ...(inquiries.data ?? []).map(item => item.id), ...(tickets.data ?? []).map(item => item.id), ...(reviews.data ?? []).map(item => item.id), ...(payments.data ?? []).map(item => item.id)]
        const purged = await db.from('email_outbox').delete().in('entity_id', entityIds)
        if (purged.error) cleanupErrors.push('Disposable notification cleanup failed')
        await db.from('email_outbox').delete().in('recipient_id', ids)
        await db.from('profiles').delete().in('id', ids)
      }
      for (const account of accounts) await clerkRequest(`/users/${account.clerkId}`, 'DELETE')
    }
    expect(cleanupErrors).toEqual([])
  }, { scope: 'worker', timeout: 120_000 }],
})

export { expect }