export class RailwayGraphQLError extends Error {
  override readonly name = 'RailwayGraphQLError'
  readonly isNotFound: boolean
  readonly isUnauthorized: boolean
  readonly messages: readonly string[]

  constructor(messages: readonly string[]) {
    super(messages.join('\n'))
    this.messages = [...messages]
    this.isNotFound = messages.some((message) => message.toLowerCase().includes('not found'))
    this.isUnauthorized = messages.some((message) =>
      message.toLowerCase().includes('not authorized'),
    )
  }
}

export class RailwayRateLimitError extends Error {
  override readonly name = 'RailwayRateLimitError'

  constructor(readonly retryAfterSeconds: number | undefined) {
    super('Railway rate limit exceeded.')
  }
}

export class RailwayHttpError extends Error {
  override readonly name = 'RailwayHttpError'

  constructor(readonly status: number) {
    super(`Railway request failed with HTTP status ${status}.`)
  }
}

export class RailwayResponseError extends Error {
  override readonly name = 'RailwayResponseError'

  constructor() {
    super('Railway returned an invalid response.')
  }
}

export class RailwaySubscriptionError extends Error {
  override readonly name = 'RailwaySubscriptionError'
  constructor(
    readonly code: number | undefined,
    detail?: string,
  ) {
    const summary =
      code === undefined
        ? 'Railway subscription failed'
        : `Railway subscription closed with code ${code}`
    super(detail ? `${summary}: ${detail}` : `${summary}.`)
  }
}
