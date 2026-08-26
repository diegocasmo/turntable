import { z } from 'zod'

// Browsers report Zod's caught JIT probe as a CSP violation.
if (typeof window !== 'undefined') {
  z.config({ jitless: true })
}

export { z }
