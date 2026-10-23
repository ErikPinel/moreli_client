import { SignIn, SignUp } from '@clerk/react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/auth/useAuth'
import heroImage from '@/assets/morali-hero.webp'

type LoginPageProps = {
  mode?: 'signin' | 'signup'
}

export function LoginPage({ mode = 'signin' }: LoginPageProps) {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const requestedRedirect = searchParams.get('redirect')
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') && ![...requestedRedirect].some((character) => character === '\\' || character.charCodeAt(0) < 32)
    ? requestedRedirect
    : '/'

  if (auth.isLoading) return <AuthPageLoader />
  if (auth.user) return <Navigate replace to={redirectTo} />

  return (
    <div dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1} className="auth-page">
        <div className="auth-shell">
          <section className="auth-visual" aria-label="לימוד אישי במורהלי">
            <img src={heroImage} alt="תלמידה לומדת בשיעור פרטי" />
            <div className="auth-visual__copy">
              <p>לומדים בדרך שמתאימה לכם</p>
              <h1>המורה הנכון כבר מחכה לכם.</h1>
            </div>
          </section>

          <section className="auth-panel" aria-labelledby="auth-title">
            <h1 className="sr-only" id="auth-title">
              {mode === 'signin' ? 'התחברות למורהלי' : 'הרשמה למורהלי'}
            </h1>
            {mode === 'signin' ? (
              <SignIn
                path="/login"
                routing="path"
                signUpUrl={`/signup?redirect=${encodeURIComponent(redirectTo)}`}
                forceRedirectUrl={redirectTo}
              />
            ) : (
              <SignUp
                path="/signup"
                routing="path"
                signInUrl={`/login?redirect=${encodeURIComponent(redirectTo)}`}
                forceRedirectUrl={redirectTo}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export function AuthCallbackPage() {
  const auth = useAuth()

  if (auth.isLoading) return <AuthPageLoader />
  return <Navigate replace to={auth.user ? '/' : '/login'} />
}

function AuthPageLoader() {
  return (
    <main id="main-content" tabIndex={-1} className="auth-page auth-page--loading" dir="rtl" role="status">
      <Spinner className="size-7 text-primary" />
      <span className="sr-only">מתחברים...</span>
    </main>
  )
}
