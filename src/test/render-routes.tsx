import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { routeTree } from '@/routeTree.gen'

export function renderRoutes(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { router, ...render(<RouterProvider router={router} />) }
}
