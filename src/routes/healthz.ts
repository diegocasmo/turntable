import { createFileRoute } from '@tanstack/react-router'
import { createNonce, createSecurityHeaders } from '../security-headers'

export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: () =>
        new Response('ok', {
          headers: {
            ...createSecurityHeaders(createNonce()),
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
})
