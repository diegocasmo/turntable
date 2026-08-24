import { definePlugin } from 'nitro'
import { loadConfig, productionEnvironment } from '@/config.server'
import { createNonce, createSecurityHeaders } from '@/security-headers'

export default definePlugin((nitroApp) => {
  if (import.meta.env.PROD) {
    loadConfig(productionEnvironment(process.env))
  }

  nitroApp.hooks.hook('response', (response) => {
    const securityHeaders = createSecurityHeaders(createNonce())

    for (const [name, value] of Object.entries(securityHeaders)) {
      if (!response.headers.has(name)) {
        response.headers.set(name, value)
      }
    }
  })
})
