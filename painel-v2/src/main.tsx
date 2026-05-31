import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { get, set, del } from 'idb-keyval'
import './index.css'
import { routeTree } from './routeTree.gen'
import { useAuth } from './store/auth'
import { ToastContainer } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { inicializarPWA } from './lib/pwa'

inicializarPWA()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // 24h - mantém no IndexedDB
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Persister IndexedDB (capacidade gigantes, vs ~5MB do localStorage)
const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key).then(v => v ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'mazyos-rq-cache',
  throttleTime: 1000,
})

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function AppRoot() {
  const auth = useAuth()
  useEffect(() => {
    auth.init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-marco-azul text-sm">Carregando...</div>
      </div>
    )
  }

  return <RouterProvider router={router} context={{ auth }} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: 'v2-2026-05-26',
        }}
      >
        <AppRoot />
        <ToastContainer />
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)
