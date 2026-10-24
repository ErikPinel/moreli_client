import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { publicDiscovery } from './seo/public-discovery.ts'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, currentDirectory, ''), ...process.env }
  if (environment.VERCEL_ENV === 'production') {
    const apiUrl = new URL(environment.VITE_API_URL || 'http://localhost:5146/api')
    if (apiUrl.protocol !== 'https:' || apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1' || !apiUrl.pathname.endsWith('/api')) {
      throw new Error('Production VITE_API_URL must be the public HTTPS API URL ending in /api')
    }
    const publishableKey = environment.VITE_CLERK_PUBLISHABLE_KEY
    const developmentClerkAllowed =
      environment.CLERK_ALLOW_DEVELOPMENT_INSTANCE === 'true' &&
      publishableKey?.startsWith('pk_test_')
    if (!publishableKey?.startsWith('pk_live_') && !developmentClerkAllowed) {
      throw new Error('Set VITE_CLERK_PUBLISHABLE_KEY to pk_live_, or explicitly allow a pk_test_ key with CLERK_ALLOW_DEVELOPMENT_INSTANCE=true for the initial deployment')
    }
    if (developmentClerkAllowed) {
      console.warn('Initial deployment uses a Clerk development instance. Switch to pk_live_ and set CLERK_ALLOW_DEVELOPMENT_INSTANCE=false when production Clerk is ready.')
    }
  }
  return {
    plugins: [react(), tailwindcss(), publicDiscovery()],
    // SDKs can read the entire env object, so expose only supported public settings.
    envPrefix: [],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(environment.VITE_API_URL ?? ''),
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(environment.VITE_CLERK_PUBLISHABLE_KEY ?? ''),
      'import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS': JSON.stringify(environment.VITE_ENABLE_QUERY_DEVTOOLS ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(currentDirectory, './src'),
      },
    },
  }
})
