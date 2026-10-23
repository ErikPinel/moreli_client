import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import configFactory from './vite.config.ts'

const createConfig = () => configFactory({ command: 'build', mode: 'production' })

describe('Vercel client configuration', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('VITE_API_URL', 'https://more-li-backend.vercel.app/api')
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_live_config_test')
    vi.stubEnv('CLERK_ALLOW_DEVELOPMENT_INSTANCE', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('accepts a live Clerk key without the temporary opt-in', () => {
    expect(createConfig).not.toThrow()
  })

  it.each(['false', '', 'TRUE', '1'])('rejects a test key when the opt-in is %j', (optIn) => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_config_test')
    vi.stubEnv('CLERK_ALLOW_DEVELOPMENT_INSTANCE', optIn)

    expect(createConfig).toThrow('CLERK_ALLOW_DEVELOPMENT_INSTANCE=true')
  })

  it('accepts a test key only with the explicit opt-in and warns', () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_config_test')
    vi.stubEnv('CLERK_ALLOW_DEVELOPMENT_INSTANCE', 'true')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(createConfig).not.toThrow()
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Clerk development instance'))
  })

  it.each(['', 'YOUR_CLERK_PUBLISHABLE_KEY', 'sk_test_not_a_publishable_key'])('rejects an invalid publishable key %j even with the opt-in', (key) => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', key)
    vi.stubEnv('CLERK_ALLOW_DEVELOPMENT_INSTANCE', 'true')

    expect(createConfig).toThrow('Set VITE_CLERK_PUBLISHABLE_KEY')
  })

  it.each(['http://localhost:5146/api', 'https://localhost/api', 'https://127.0.0.1/api', 'https://example.com/'])('still rejects an invalid production API URL %j', (url) => {
    vi.stubEnv('VITE_API_URL', url)

    expect(createConfig).toThrow('public HTTPS API URL ending in /api')
  })

  it('exposes only the three supported public settings', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unused.example.supabase.co')
    vi.stubEnv('CLERK_SECRET_KEY', 'server-only-test-value')

    const config = createConfig()

    expect(config.envPrefix).toEqual([])
    expect(Object.keys(config.define ?? {}).sort()).toEqual([
      'import.meta.env.VITE_API_URL',
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY',
      'import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS',
    ])
    expect(JSON.stringify(config.define)).not.toContain('server-only-test-value')
    expect(JSON.stringify(config.define)).not.toContain('unused.example.supabase.co')
  })

  it('preserves local development without the production opt-in', () => {
    vi.stubEnv('VERCEL_ENV', 'development')
    vi.stubEnv('VITE_API_URL', 'http://localhost:5146/api')
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_config_test')

    expect(createConfig).not.toThrow()
  })
})
