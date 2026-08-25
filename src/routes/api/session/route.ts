import { createFileRoute } from '@tanstack/react-router'
import { handleSessionDelete } from '@/routes/api/session/-delete.server'
import { handleSessionPost } from '@/routes/api/session/-post.server'
import { sessionRouteMiddleware } from '@/routes/api/session/-request.server'

export const Route = createFileRoute('/api/session')({
  server: {
    middleware: [sessionRouteMiddleware],
    handlers: {
      DELETE: ({ context }) => handleSessionDelete(context.sessionRouteConfig),
      POST: ({ context, request }) => handleSessionPost(request, context.sessionRouteConfig),
    },
  },
})
