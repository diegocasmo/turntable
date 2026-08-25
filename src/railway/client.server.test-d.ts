import { graphql } from 'gql.tada'
import { railwaySmokeQuery } from '@/gql/operations/railway-smoke'
import type { createRailwayClient } from '@/railway/client.server'

declare const client: ReturnType<typeof createRailwayClient>
declare const token: string

const noVariablesQuery = graphql(`
  query RailwayClientTypeTest {
    __typename
  }
`)

void client.request({ document: noVariablesQuery, token })

void client.request({
  document: railwaySmokeQuery,
  token,
  variables: { environmentId: 'environment-1', projectId: 'project-1' },
})

// @ts-expect-error: The operation requires variables.
void client.request({ document: railwaySmokeQuery, token })

// @ts-expect-error: The operation requires environmentId.
void client.request({ document: railwaySmokeQuery, token, variables: { projectId: 'project-1' } })

void client.request({
  document: railwaySmokeQuery,
  token,
  // @ts-expect-error: The operation does not define environmentID.
  variables: { environmentID: 'environment-1', projectId: 'project-1' },
})

void client.request({
  document: railwaySmokeQuery,
  token,
  // @ts-expect-error: The operation does not define serviceId.
  variables: { environmentId: 'environment-1', projectId: 'project-1', serviceId: 'service-1' },
})
