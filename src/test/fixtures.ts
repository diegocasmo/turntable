import { Buffer } from 'node:buffer'

export const testAppOrigin = 'https://turntable.test'
export const testRailwayApiUrl = 'https://backboard.railway.test/graphql/v2'
export const testRailwayEnvironmentId = 'environment-1'
export const testRailwayProjectId = 'project-1'
export const testRailwayToken = 'railway-token-that-must-not-leak'
export const testSessionSecret = Buffer.alloc(32, 1).toString('base64')
