import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { RouteMetadata } from '@/components/layout/RouteMetadata'
import { AppProviders } from './providers'
import { AppRouter } from './router'

const router = createBrowserRouter([{ path: '*', element: <AppProviders><RouteMetadata /><AppRouter /><WhatsAppButton /></AppProviders> }])

export default function App() {
  return <RouterProvider router={router} />
}