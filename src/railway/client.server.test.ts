import { print } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import { projectsQuery } from '@/gql/operations/projects'
import { createRailwayClient } from '@/railway/client.server'
import {
  RailwayGraphQLError,
  RailwayHttpError,
  RailwayRateLimitError,
  RailwayResponseError,
} from '@/railway/errors'
import {
  createRailwayPage,
  testRailwayApiUrl,
  testRailwayToken,
  testRailwayWorkspaceId,
} from '@/test/railway'
import { createJsonResponse } from '@/test/response'

const query = print(projectsQuery)
const variables = { workspaceId: testRailwayWorkspaceId }
const validData = { projects: createRailwayPage([]) }

function setUpClient(response: Response) {
  const fetchRequest = vi.fn(async (_request: Request) => response)
  const writeError = vi.fn<(line: string) => void>()
  const client = createRailwayClient({
    apiUrl: testRailwayApiUrl,
    fetch: fetchRequest,
    writeError,
  })

  return { client, fetchRequest, writeError }
}

function sendRequest(client: ReturnType<typeof createRailwayClient>) {
  return client.request({ document: projectsQuery, token: testRailwayToken, variables })
}

describe('Railway HTTP client', () => {
  it('sends an authorized GraphQL request and returns valid data', async () => {
    const { client, fetchRequest } = setUpClient(createJsonResponse({ data: validData }))

    await expect(sendRequest(client)).resolves.toEqual(validData)

    const request = fetchRequest.mock.calls[0]?.[0]

    expect(request).toBeInstanceOf(Request)
    expect(request?.url).toBe(testRailwayApiUrl)
    expect(request?.method).toBe('POST')
    expect(request?.headers.get('authorization')).toBe(`Bearer ${testRailwayToken}`)
    expect(request?.headers.get('content-type')).toBe('application/json')
    await expect(request?.json()).resolves.toEqual({
      query,
      variables,
    })
  })

  it('stops on GraphQL errors and identifies the pinned authorization message', async () => {
    const notAuthorizedMessage = `Not Authorized: ${testRailwayToken}`
    const response = createJsonResponse({
      data: { project: { id: 'partial-project' } },
      errors: [{ message: notAuthorizedMessage }, { message: 'A second Railway error' }],
    })
    const { client } = setUpClient(response)

    await expect(sendRequest(client)).rejects.toMatchObject({
      isUnauthorized: true,
      messages: ['Not Authorized: [REDACTED]', 'A second Railway error'],
      name: RailwayGraphQLError.name,
    })
  })

  it('rejects a 200 body that is not a GraphQL response', async () => {
    const { client } = setUpClient(createJsonResponse({ message: 'Problem processing request' }))

    await expect(sendRequest(client)).rejects.toBeInstanceOf(RailwayResponseError)
  })

  it.each([
    ['missing', {}],
    ['null', { data: null }],
  ])('rejects a GraphQL response with %s data', async (_name, body) => {
    const { client } = setUpClient(createJsonResponse(body))

    await expect(sendRequest(client)).rejects.toBeInstanceOf(RailwayResponseError)
  })

  it('reads whole Retry-After seconds from a 429 response', async () => {
    const response = new Response(null, { headers: { 'retry-after': '12' }, status: 429 })
    const { client } = setUpClient(response)

    await expect(sendRequest(client)).rejects.toMatchObject({
      name: RailwayRateLimitError.name,
      retryAfterSeconds: 12,
    })
  })

  it.each([undefined, '1.5', 'after lunch', '999999999999999999999'])(
    'leaves the retry delay empty for an invalid Retry-After value: %s',
    async (retryAfter) => {
      const response =
        retryAfter === undefined
          ? new Response(null, { status: 429 })
          : new Response(null, { headers: { 'retry-after': retryAfter }, status: 429 })
      const { client } = setUpClient(response)

      await expect(sendRequest(client)).rejects.toMatchObject({ retryAfterSeconds: undefined })
    },
  )

  it.each([
    [400, JSON.stringify({ message: 'Problem processing request' })],
    [404, 'Not Found'],
  ])('logs a safe HTTP %i failure with any response body', async (status, body) => {
    const response = new Response(body, { status })
    const { client, writeError } = setUpClient(response)

    await expect(sendRequest(client)).rejects.toMatchObject({
      name: RailwayHttpError.name,
      status,
    })

    expect(writeError).toHaveBeenCalledOnce()
    const line = writeError.mock.calls[0]?.[0]
    expect(line).toContain(`HTTP status ${status}`)
    expect(line).toContain('[REDACTED]')
    expect(line).not.toContain(testRailwayToken)
    expect(line).not.toContain(body)
    expect(line).not.toContain('body')
    expect(response.bodyUsed).toBe(true)
  })
})
