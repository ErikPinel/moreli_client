import { describe, expect, it, vi } from 'vitest'

vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ profile: null }) }))
vi.mock('./useAccountData', () => ({ useTeacherProfile: () => ({ data: undefined }) }))

const { canLearn, resolveAccountView, viewFromPath } = await import('./account-view')

describe('account view', () => {
  it('lets every personal account learn, but not admins', () => {
    expect(canLearn('student')).toBe(true)
    expect(canLearn('teacher')).toBe(true)
    expect(canLearn('admin')).toBe(false)
    expect(canLearn(undefined)).toBe(false)
  })

  it('reads the mode from workspace paths only', () => {
    expect(viewFromPath('/student/inquiries/1')).toBe('student')
    expect(viewFromPath('/teacher/dashboard')).toBe('teacher')
    expect(viewFromPath('/teachers/dana')).toBeNull()
    expect(viewFromPath('/students')).toBeNull()
    expect(viewFromPath('/')).toBeNull()
  })

  it('keeps students in student mode even on teacher paths', () => {
    expect(resolveAccountView('student', '/teacher/dashboard', 'teacher')).toBe('student')
  })

  it('gives teachers the path mode, then the remembered mode, then student as the base', () => {
    expect(resolveAccountView('teacher', '/teacher/inquiries', 'student')).toBe('teacher')
    expect(resolveAccountView('teacher', '/student/favorites', 'teacher')).toBe('student')
    expect(resolveAccountView('teacher', '/teachers', 'teacher')).toBe('teacher')
    expect(resolveAccountView('teacher', '/', null)).toBe('student')
  })
})
