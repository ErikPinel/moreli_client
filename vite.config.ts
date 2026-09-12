import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, currentDirectory, ''), ...process.env }
  if (environment.VERCEL_ENV === 'production') {
    const apiUrl = new URL(environment.VITE_API_URL || 'http://localhost:5146/api')
    if (apiUrl.protocol !== 'https:' || apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1' || !apiUrl.pathname.endsWith('/api')) {
      throw new Error('Production VITE_API_URL must be the public HTTPS API URL ending in /api')
    }
    if (!environment.VITE_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')) {
      throw new Error('Production requires a live Clerk publishable key')
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(currentDirectory, './src'),
    },
  },
  }
})
