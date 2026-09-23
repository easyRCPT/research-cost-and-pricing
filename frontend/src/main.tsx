import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from './components/ui/sonner.tsx'
import './index.css'
import { makeRouter } from './router.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Since the screens became routes (#43), moving between them remounts
      // the editor, and at the default staleTime of 0 every tab refetched the
      // budget and the project list -- about 2.5s a switch against 1s for a
      // tab that did not. Nothing is lost by caching: every mutation either
      // writes the server's reply straight into the cache or invalidates it,
      // and invalidation still refetches whatever staleTime says. Five
      // minutes rather than Infinity so a missed invalidation heals itself.
      staleTime: 5 * 60 * 1000,
    },
  },
})

// The router needs the cache: its guards ask who is signed in before a private
// route loads, and share the answer with the screens underneath.
const router = makeRouter(queryClient)

// Measuring how the app feels: do it against `pnpm build && pnpm preview`,
// not the dev server. StrictMode renders every component twice in development,
// and the devtools below subscribe to every query and mutation. Both are dev
// only, so typing is slower here than in anything deployed.
//
// The query client stays outside the router: the routes suspend on queries, so
// the provider has to be above them.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
