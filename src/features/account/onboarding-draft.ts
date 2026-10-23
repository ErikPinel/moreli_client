import { z } from 'zod'

const slotSchema = z.object({ day_of_week: z.number().int().min(0).max(6), start_time: z.string().max(8), end_time: z.string().max(8) })

export const onboardingDraftSchema = z.object({
  firstName: z.string().max(100), lastName: z.string().max(100), phone: z.string().max(30),
  citySlug: z.string().max(200), avatarPath: z.string().max(1000).nullable(),
  headline: z.string().max(200), bio: z.string().max(5000), price: z.string().max(10), experience: z.string().max(3),
  online: z.boolean(), inPerson: z.boolean(), subjectSlugs: z.array(z.string().max(200)).max(1000),
  citySlugs: z.array(z.string().max(200)).max(1200),
  slots: z.array(slotSchema).max(100),
})

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const prefix = 'moreli:onboarding:'
const lifetime = 24 * 60 * 60 * 1000
const envelopeSchema = z.object({ version: z.literal(1), owner: z.string(), expiresAt: z.number(), data: onboardingDraftSchema })

export function readOnboardingDraft(storage: DraftStorage, owner: string, now = Date.now()): OnboardingDraft | null {
  try {
    const raw = storage.getItem(prefix + owner)
    if (!raw) return null
    const parsed = envelopeSchema.safeParse(JSON.parse(raw))
    if (parsed.success && parsed.data.owner === owner && parsed.data.expiresAt > now && parsed.data.expiresAt <= now + lifetime) return parsed.data.data
    storage.removeItem(prefix + owner)
  } catch { return null }
  return null
}

export function writeOnboardingDraft(storage: DraftStorage, owner: string, data: OnboardingDraft, now = Date.now()): boolean {
  try {
    storage.setItem(prefix + owner, JSON.stringify({ version: 1, owner, expiresAt: now + lifetime, data: onboardingDraftSchema.parse(data) }))
    return true
  } catch { return false }
}

export function clearOnboardingDraft(storage: DraftStorage, owner: string) {
  try { storage.removeItem(prefix + owner) } catch { return }
}

export function clearAccountDrafts(storage: Storage) {
  try { Object.keys(storage).filter(key => key.startsWith(prefix)).forEach(key => storage.removeItem(key)) } catch { return }
}