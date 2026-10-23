import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type PropsWithChildren, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { createQueryClient } from './query-client'
import { clearAccountDrafts } from '@/features/account/onboarding-draft'

export function AppProviders({ children }: PropsWithChildren) {
  const { userId, sessionId, isLoaded } = useAuth()
  useEffect(() => {
    if (isLoaded && !userId) {
      try { clearAccountDrafts(sessionStorage) } catch { return }
    }
  }, [isLoaded, userId])
  return <SessionProviders key={`${userId ?? 'anonymous'}:${sessionId ?? ''}`}>{children}</SessionProviders>
}

function SessionProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-center" richColors />
      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}