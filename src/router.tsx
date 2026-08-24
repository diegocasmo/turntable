import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { routeTree } from './routeTree.gen'
import { createNonce } from './security-headers'

const getSsrOptions = createIsomorphicFn().server(() => ({ nonce: createNonce() }))

export function getRouter() {
  const queryClient = new QueryClient()
  const ssr = getSsrOptions()

  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ...(ssr ? { ssr } : {}),
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
