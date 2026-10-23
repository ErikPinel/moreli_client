import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { LogOut, MailCheck, RefreshCw, Settings } from 'lucide-react'
import { type PropsWithChildren, useEffect } from 'react'
import { apiRequest, setAccessTokenProvider } from '@/api/api-client'
import { ApiError } from '@/api/api-error'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import type { ProfileDto } from '@/types/api'
import { AuthContext } from './auth-context'
import { EmailVerificationForm } from './EmailVerificationForm'

export function AuthProvider({ children }: PropsWithChildren) {
  const clerk = useClerk()
  const { getToken, isLoaded, isSignedIn, signOut: clerkSignOut, userId } = useClerkAuth()
  const { isLoaded: isUserLoaded, user } = useUser()

  useEffect(() => {
    setAccessTokenProvider(isSignedIn ? () => getToken() : null)
    return () => setAccessTokenProvider(null)
  }, [getToken, isSignedIn])

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const profile = await apiRequest<ProfileDto>(endpoints.currentUser)
      const firstName = user?.firstName?.trim() ?? ''
      const lastName = user?.lastName?.trim() ?? ''
      const contactEmail = user?.primaryEmailAddress?.emailAddress.trim().toLowerCase() ?? ''
      const needsNameSync =
        (!profile.first_name.trim() && firstName) ||
        (!profile.last_name.trim() && lastName) ||
        (contactEmail && profile.contact_email !== contactEmail)

      if (!needsNameSync) return profile
      return apiRequest<ProfileDto>(endpoints.currentUser, {
        method: 'PATCH',
        body: {
          firstName: profile.first_name.trim() || firstName,
          lastName: profile.last_name.trim() || lastName,
          contactEmail,
        },
      })
    },
    enabled: isLoaded && isUserLoaded && Boolean(isSignedIn),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 403) && failureCount < 2,
    staleTime: 5 * 60_000,
  })

  const errorDetails = profileQuery.error instanceof ApiError ? profileQuery.error.details : null
  const needsEmailVerification = Boolean(errorDetails && typeof errorDetails === 'object' && 'code' in errorDetails && errorDetails.code === 'EMAIL_VERIFICATION_REQUIRED')

  async function signOut() {
    await clerkSignOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user: user
          ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
            }
          : null,
        profile: profileQuery.data ?? null,
        isLoading:
          !isLoaded ||
          !isUserLoaded ||
          (Boolean(isSignedIn) && profileQuery.isPending),
        signOut,
      }}
    >
      {isSignedIn && profileQuery.isError ? (
        <main id="main-content" tabIndex={-1} dir="rtl" className="page-shell auth-recovery">
          <div className="auth-recovery__content">
            <MailCheck aria-hidden="true" className="auth-recovery__mark" />
            <h1>{needsEmailVerification ? 'נדרש אימות כתובת המייל' : 'לא הצלחנו לטעון את החשבון'}</h1>
            <p>{needsEmailVerification ? 'יש להוסיף ולאמת כתובת מייל ראשית בחשבון כדי להמשיך.' : 'נסו שוב בעוד רגע. אם הבעיה נמשכת, פנו לתמיכה.'}</p>
            {needsEmailVerification && user?.primaryEmailAddress ? (
              <EmailVerificationForm key={user.primaryEmailAddress.id} email={user.primaryEmailAddress} onVerified={async () => {
                await user.reload()
                await profileQuery.refetch()
              }} />
            ) : null}
            <div className="auth-recovery__secondary">
              {needsEmailVerification ? <Button type="button" variant="ghost" onClick={() => clerk.openUserProfile()}><Settings aria-hidden="true" />ניהול החשבון ואימות המייל</Button> : null}
              <Button type="button" variant={needsEmailVerification ? 'ghost' : 'default'} disabled={profileQuery.isFetching} onClick={() => void profileQuery.refetch()}><RefreshCw aria-hidden="true" />{needsEmailVerification ? 'אימתתי את המייל, בדיקה מחדש' : 'ניסיון נוסף'}</Button>
              <Button type="button" variant="ghost" onClick={() => void signOut()}><LogOut aria-hidden="true" />התנתקות</Button>
            </div>
          </div>
        </main>
      ) : children}
    </AuthContext.Provider>
  )
}