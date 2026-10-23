import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { AppRouter } from './router'

const router = createBrowserRouter([{ path: '*', element: <AppProviders><AppRouter /></AppProviders> }])

export default function App() {
  return <RouterProvider router={router} />
}