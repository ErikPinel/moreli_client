import { createContext } from 'react'
import type { ProfileDto } from '@/types/api'

export type AuthenticatedUser = {
  id: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
}

export type AuthContextValue = {
  user: AuthenticatedUser | null
  profile: ProfileDto | null
  isLoading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)