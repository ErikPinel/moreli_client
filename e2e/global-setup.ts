import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { clerkSetup } from '@clerk/testing/playwright'

export default async function globalSetup() {
  const backend = parseEnv(readFileSync(fileURLToPath(new URL('../../backend/.env', import.meta.url)), 'utf8'))
  const client = parseEnv(readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8'))
  if (!backend.CLERK_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Browser acceptance requires a development Clerk instance')
  process.env.CLERK_SECRET_KEY = backend.CLERK_SECRET_KEY
  await clerkSetup({ publishableKey: client.VITE_CLERK_PUBLISHABLE_KEY, secretKey: backend.CLERK_SECRET_KEY, dotenv: false })
}