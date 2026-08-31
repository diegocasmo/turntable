import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFoundPage } from '@/components/not-found-page'
import { createSecurityHeaders } from '@/security-headers'
import { sessionQueryOptions } from '@/session/queries'
import appCss from '@/styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => ({
    sessionState: await context.queryClient.ensureQueryData(sessionQueryOptions),
  }),
  headers: ({ ssr }) => (ssr?.nonce ? createSecurityHeaders(ssr.nonce) : undefined),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Turntable' },
      {
        name: 'description',
        content: 'Start and stop Railway containers from one clear service view.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/turntable.svg', type: 'image/svg+xml' },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
