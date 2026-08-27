import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { routeTree } from '@/routeTree.gen'
import { createNonce } from '@/security-headers'
import { z } from '@/zod'

const getSsrOptions = createIsomorphicFn().server(() => ({ nonce: createNonce() }))

function createDehydratedQueryState(queryClient: QueryClient) {
  return z.json().parse(
    dehydrate(queryClient, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    }),
  )
}

export function getRouter() {
  const queryClient = new QueryClient()
  const ssr = getSsrOptions()
  const dehydrateRouter = () => ({ queryClientState: createDehydratedQueryState(queryClient) })

  return createRouter({
    context: { queryClient },
    dehydrate: dehydrateRouter,
    hydrate: (state: ReturnType<typeof dehydrateRouter>) => {
      hydrate(queryClient, state.queryClientState)
    },
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    trailingSlash: 'never',
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
