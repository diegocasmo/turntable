import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createRailwayClient } from './client.server.ts'
import {
  RailwayGraphQLError,
  RailwayHttpError,
  RailwayRateLimitError,
  RailwayResponseError,
} from './errors.ts'

const apiUrl = 'https://backboard.railway.test/graphql/v2'
const query = 'query Project($id: String!) { project(id: $id) { id } }'
const token = 'railway-token-that-must-not-leak'
const projectSchema = z.object({ project: z.object({ id: z.string() }) })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })
}

function setup(response: Response) {
  const fetchRequest = vi.fn(async (_request: Request) => response)
  const writeError = vi.fn<(line: string) => void>()
  const client = createRailwayClient({ apiUrl, fetch: fetchRequest, writeError })

  return { client, fetchRequest, writeError }
}

describe('Railway HTTP client', () => {
  it('sends an authorized GraphQL request and returns valid data', async () => {
    const { client, fetchRequest } = setup(jsonResponse({ data: { project: { id: 'project-1' } } }))

    await expect(
      client.request({
        dataSchema: projectSchema,
        query,
        token,
        variables: { id: 'project-1' },
      }),
    ).resolves.toEqual({ project: { id: 'project-1' } })

    const request = fetchRequest.mock.calls[0]?.[0]

    expect(request).toBeInstanceOf(Request)
    expect(request?.url).toBe(apiUrl)
    expect(request?.method).toBe('POST')
    expect(request?.headers.get('authorization')).toBe(`Bearer ${token}`)
    expect(request?.headers.get('content-type')).toBe('application/json')
    await expect(request?.json()).resolves.toEqual({
      query,
      variables: { id: 'project-1' },
    })
  })

  it('stops on GraphQL errors and identifies the pinned authorization message', async () => {
    const notAuthorizedMessage = 'Not Authorized'
    const response = jsonResponse({
      data: { project: { id: 'partial-project' } },
      errors: [{ message: notAuthorizedMessage }, { message: 'A second Railway error' }],
    })
    const { client } = setup(response)

    await expect(client.request({ dataSchema: projectSchema, query, token })).rejects.toMatchObject(
      {
        isUnauthorized: true,
        messages: [notAuthorizedMessage, 'A second Railway error'],
        name: RailwayGraphQLError.name,
      },
    )
  })

  it('rejects a 200 body that is not a GraphQL envelope', async () => {
    const { client } = setup(jsonResponse({ message: 'Problem processing request' }))

    await expect(
      client.request({ dataSchema: projectSchema, query, token }),
    ).rejects.toBeInstanceOf(RailwayResponseError)
  })

  it('reads whole Retry-After seconds from a 429 response', async () => {
    const response = new Response(null, { headers: { 'retry-after': '12' }, status: 429 })
    const { client } = setup(response)

    await expect(client.request({ dataSchema: projectSchema, query, token })).rejects.toMatchObject(
      {
        name: RailwayRateLimitError.name,
        retryAfterSeconds: 12,
      },
    )
  })

  it.each([undefined, '1.5', 'after lunch', '999999999999999999999'])(
    'leaves the retry delay empty for an invalid Retry-After value: %s',
    async (retryAfter) => {
      const response =
        retryAfter === undefined
          ? new Response(null, { status: 429 })
          : new Response(null, { headers: { 'retry-after': retryAfter }, status: 429 })
      const { client } = setup(response)

      await expect(
        client.request({ dataSchema: projectSchema, query, token }),
      ).rejects.toMatchObject({ retryAfterSeconds: undefined })
    },
  )

  it.each([
    [400, JSON.stringify({ message: 'Problem processing request' })],
    [404, 'Not Found'],
  ])('logs a safe HTTP %i failure with any response body', async (status, body) => {
    const response = new Response(body, { status })
    const { client, writeError } = setup(response)

    await expect(client.request({ dataSchema: projectSchema, query, token })).rejects.toMatchObject(
      {
        name: RailwayHttpError.name,
        status,
      },
    )

    expect(writeError).toHaveBeenCalledOnce()
    const line = writeError.mock.calls[0]?.[0]
    expect(line).toContain(`HTTP status ${status}`)
    expect(line).toContain('[REDACTED]')
    expect(line).not.toContain(token)
    expect(line).not.toContain(body)
    expect(line).not.toContain('body')
    expect(response.bodyUsed).toBe(true)
  })
})
