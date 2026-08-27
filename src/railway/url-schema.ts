import { z } from 'zod'

export const railwayHostname = 'backboard.railway.com'

const railwayHostnamePattern = new RegExp(`^${railwayHostname.replaceAll('.', '[.]')}$`)

export const railwayHttpsUrlSchema = z.url({
  hostname: railwayHostnamePattern,
  protocol: /^https$/,
  error: `must use https and ${railwayHostname}`,
})
