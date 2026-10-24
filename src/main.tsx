import { heIL } from '@clerk/localizations'
import { ClerkProvider } from '@clerk/react'
import { ui } from '@clerk/ui'
import { shadcn } from '@clerk/ui/themes'
import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      ui={ui}
      appearance={{ theme: shadcn }}
      localization={heIL}
      afterSignOutUrl="/"
    >
      <App />
    </ClerkProvider>
    <Analytics />
  </StrictMode>,
)
