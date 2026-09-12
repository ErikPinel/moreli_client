import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type PropsWithChildren, useState } from 'react'
import { useAuth } from '@clerk/react'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { createQueryClient } from './query-client'

export function AppProviders({ children }: PropsWithChildren) {
  const { userId, sessionId } = useAuth()
  return <SessionProviders key={`${userId ?? 'anonymous'}:${sessionId ?? ''}`}>{children}</SessionProviders>
}

function SessionProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-center" richColors />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}