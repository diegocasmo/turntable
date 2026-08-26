import { describe, expect, it } from 'vitest'
import { loadRailwayE2EConfig } from '@/railway/check-target.server'
import { testRailwayEnvironmentId, testRailwayProjectId, testRailwayToken } from '@/test/railway'

const validEnvironment = {
  RAILWAY_API_URL: 'https://backboard.railway.com/graphql/v2',
  RAILWAY_TEST_ENVIRONMENT_ID: testRailwayEnvironmentId,
  RAILWAY_TEST_PROJECT_ID: testRailwayProjectId,
  RAILWAY_TEST_SERVICE_ID: 'service-1',
  RAILWAY_TEST_TOKEN: testRailwayToken,
}

describe('Railway E2E configuration', () => {
  it('reads every required value', () => {
    expect(loadRailwayE2EConfig(validEnvironment)).toEqual({
      apiUrl: validEnvironment.RAILWAY_API_URL,
      environmentId: validEnvironment.RAILWAY_TEST_ENVIRONMENT_ID,
      projectId: validEnvironment.RAILWAY_TEST_PROJECT_ID,
      serviceId: validEnvironment.RAILWAY_TEST_SERVICE_ID,
      token: validEnvironment.RAILWAY_TEST_TOKEN,
    })
  })

  it.each(['RAILWAY_TEST_TOKEN', 'RAILWAY_TEST_PROJECT_ID'])(
    'names a missing value without printing another value: %s',
    (name) => {
      const environment = { ...validEnvironment, [name]: undefined }

      expect(() => loadRailwayE2EConfig(environment)).toThrow(name)
      expect(() => loadRailwayE2EConfig(environment)).not.toThrow(
        validEnvironment.RAILWAY_TEST_TOKEN,
      )
    },
  )

  it('rejects an API host that could receive the token', () => {
    expect(() =>
      loadRailwayE2EConfig({
        ...validEnvironment,
        RAILWAY_API_URL: 'https://example.com/graphql/v2',
      }),
    ).toThrow('RAILWAY_API_URL')
  })
})
