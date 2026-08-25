import { Buffer } from 'node:buffer'

export const testAppOrigin = 'https://turntable.test'
export const testSessionSecret = Buffer.alloc(32, 1).toString('base64')
