import { describe, expect, it } from 'vitest'
import { clearOnboardingDraft, readOnboardingDraft, writeOnboardingDraft, type OnboardingDraft } from './onboarding-draft'

const draft: OnboardingDraft = { firstName: 'Teacher', lastName: 'Example', phone: '0500000000', citySlug: 'haifa', avatarPath: null, headline: 'Math teacher', bio: 'Personal teaching', price: '120', experience: '0', online: true, inPerson: false, subjectSlugs: ['math'], citySlugs: [], slots: [{ day_of_week: 1, start_time: '09:00', end_time: '21:00' }] }
const createStorage = () => {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('private onboarding drafts', () => {
  it('restores legacy drafts while discarding retired level selections', () => {
    const storage = createStorage()
    storage.setItem('moreli:onboarding:owner-a', JSON.stringify({ version: 1, owner: 'owner-a', expiresAt: 5000, data: { ...draft, levelIds: [1] } }))
    expect(readOnboardingDraft(storage, 'owner-a', 1000)).toEqual(draft)
  })
  it('restores a complete draft for only its owner', () => {
    const storage = createStorage()
    expect(writeOnboardingDraft(storage, 'owner-a', draft, 1000)).toBe(true)
    expect(readOnboardingDraft(storage, 'owner-a', 2000)).toEqual(draft)
    expect(readOnboardingDraft(storage, 'owner-b', 2000)).toBeNull()
  })
  it('expires drafts after 24 hours and clears them after submission', () => {
    const storage = createStorage()
    writeOnboardingDraft(storage, 'owner-a', draft, 1000)
    expect(readOnboardingDraft(storage, 'owner-a', 1000 + 86400000)).toBeNull()
    writeOnboardingDraft(storage, 'owner-a', draft)
    clearOnboardingDraft(storage, 'owner-a')
    expect(readOnboardingDraft(storage, 'owner-a')).toBeNull()
  })
  it('discards corrupt, foreign-owner and invalid data rather than breaking the form', () => {
    const storage = createStorage()
    for (const raw of ['not-json', JSON.stringify({ version: 1, owner: 'other', expiresAt: 5000, data: draft }), JSON.stringify({ version: 1, owner: 'owner-a', expiresAt: 5000, data: { ...draft, slots: [{ day_of_week: 99 }] } })]) {
      storage.setItem('moreli:onboarding:owner-a', raw)
      expect(readOnboardingDraft(storage, 'owner-a', 1000)).toBeNull()
    }
  })
  it('tolerates unavailable browser storage without blocking profile editing', () => {
    const storage = { getItem: () => { throw new Error('disabled') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('disabled') } }
    expect(readOnboardingDraft(storage, 'owner-a')).toBeNull()
    expect(writeOnboardingDraft(storage, 'owner-a', draft)).toBe(false)
    expect(() => clearOnboardingDraft(storage, 'owner-a')).not.toThrow()
  })
})