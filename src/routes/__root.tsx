import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFoundPage } from '@/components/not-found-page'
import { createSecurityHeaders } from '@/security-headers'
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  headers: ({ ssr }) => (ssr?.nonce ? createSecurityHeaders(ssr.nonce) : undefined),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Turntable' },
      {
        name: 'description',
        content: 'Start and stop one Railway container, and see its status live.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
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
