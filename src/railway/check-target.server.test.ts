import { describe, expect, it } from 'vitest'
import { loadRailwaySmokeConfig } from '@/railway/check-target.server'
import { testRailwayEnvironmentId, testRailwayProjectId, testRailwayToken } from '@/test/railway'

const validEnvironment = {
  RAILWAY_API_URL: 'https://backboard.railway.com/graphql/v2',
  RAILWAY_TEST_ENVIRONMENT_ID: testRailwayEnvironmentId,
  RAILWAY_TEST_PROJECT_ID: testRailwayProjectId,
  RAILWAY_TEST_SERVICE_ID: 'service-1',
  RAILWAY_TEST_TOKEN: testRailwayToken,
}

describe('Railway smoke configuration', () => {
  it('reads every required value', () => {
    expect(loadRailwaySmokeConfig(validEnvironment)).toEqual({
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

      expect(() => loadRailwaySmokeConfig(environment)).toThrow(name)
      expect(() => loadRailwaySmokeConfig(environment)).not.toThrow(
        validEnvironment.RAILWAY_TEST_TOKEN,
      )
    },
  )

  it('rejects an API host that could receive the token', () => {
    expect(() =>
      loadRailwaySmokeConfig({
        ...validEnvironment,
        RAILWAY_API_URL: 'https://example.com/graphql/v2',
      }),
    ).toThrow('RAILWAY_API_URL')
  })
})
