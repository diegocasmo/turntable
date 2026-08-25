import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { invalidRailwayTokenMessage, railwayTokenSchema } from '@/session-schema'

const railwayTokensUrl = 'https://railway.com/account/tokens'

type FetchRequest = (input: string, init?: RequestInit) => Promise<Response>
type SessionState = 'authenticated' | 'expired' | 'signed-out'

class SessionRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SessionRequestError'
    this.status = status
  }
}

function fetchSession(input: string, init?: RequestInit) {
  return globalThis.fetch(input, init)
}

async function readResponseError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => undefined)

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error
  }

  return fallback
}

async function connectToRailway(token: string, fetchRequest: FetchRequest) {
  const response = await fetchRequest('/api/session', {
    body: JSON.stringify({ token }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) {
    const message = await readResponseError(
      response,
      'Turntable could not connect to Railway. Try again.',
    )
    throw new SessionRequestError(message, response.status)
  }
}

async function disconnectFromRailway(fetchRequest: FetchRequest) {
  const response = await fetchRequest('/api/session', { method: 'DELETE' })

  if (!response.ok) {
    const message = await readResponseError(
      response,
      'Turntable could not sign out this browser. Try again.',
    )
    throw new SessionRequestError(message, response.status)
  }
}

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof SessionRequestError ? error.message : fallback
}

type TokenFormProps = Readonly<{
  fetchRequest?: FetchRequest
}>

export function TokenForm({ fetchRequest = fetchSession }: TokenFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [sessionState, setSessionState] = useState<SessionState>('signed-out')
  const connectMutation = useMutation({
    mutationFn: () => {
      const form = formRef.current
      const token = form === null ? null : new FormData(form).get('token')

      if (typeof token !== 'string') {
        throw new Error('The token field is not available.')
      }

      const result = railwayTokenSchema.safeParse(token)

      if (!result.success) {
        throw new SessionRequestError(invalidRailwayTokenMessage, 400)
      }

      return connectToRailway(result.data, fetchRequest)
    },
    onSuccess: () => setSessionState('authenticated'),
  })
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectFromRailway(fetchRequest),
    onError: (error) => {
      if (error instanceof SessionRequestError && error.status === 401) {
        setSessionState('expired')
      }
    },
    onSuccess: () => setSessionState('signed-out'),
  })

  function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    connectMutation.mutate()
  }

  const showsTokenForm = sessionState !== 'authenticated'
  const connectError = connectMutation.isError
    ? readErrorMessage(connectMutation.error, 'Turntable could not connect to Railway. Try again.')
    : null

  return (
    <div className="relative grid min-h-screen grid-rows-[1fr_auto] overflow-hidden bg-[#141613] text-[#f4f0e6]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(244,240,230,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(244,240,230,0.05)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <main className="relative grid place-items-center px-6 py-14 sm:py-20">
        <section
          aria-labelledby="page-title"
          className="w-full max-w-5xl border border-[#706d60] bg-[#1d201c]/95 shadow-[14px_14px_0_#090a08]"
        >
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <header className="relative overflow-hidden border-b border-[#706d60] p-8 sm:p-12 lg:border-r lg:border-b-0">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#d59c55]">
                Railway container control
              </p>
              <h1
                id="page-title"
                className="mt-5 text-6xl leading-none tracking-[-0.05em] sm:text-8xl"
              >
                Turntable
              </h1>
              <p className="mt-7 max-w-md text-lg leading-8 text-[#c9c5b9]">
                One service. Live state. Clear controls.
              </p>

              <div
                aria-hidden="true"
                className="relative mt-14 aspect-square w-44 rounded-full border border-[#706d60] sm:w-52"
              >
                <div className="absolute inset-4 rounded-full border border-[#706d60]" />
                <div className="absolute inset-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-[#d59c55]" />
                <div className="absolute inset-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d59c55] bg-[#1d201c]" />
              </div>
            </header>

            <div className="flex min-h-[30rem] items-center p-8 sm:p-12">
              {showsTokenForm ? (
                <form
                  ref={formRef}
                  aria-labelledby="connect-title"
                  className="w-full"
                  onSubmit={handleConnect}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
                    Step 01 / Connect
                  </p>
                  <h2 id="connect-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
                    Connect to Railway
                  </h2>
                  <p className="mt-4 leading-7 text-[#c9c5b9]">
                    Use a{' '}
                    <a
                      className="text-[#e5ad68] underline underline-offset-4 hover:text-[#f4f0e6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                      href={railwayTokensUrl}
                    >
                      workspace token from Railway
                    </a>
                    . Keep it in a password manager.
                  </p>

                  {sessionState === 'expired' ? (
                    <p
                      role="alert"
                      className="mt-6 border-l-2 border-[#e5ad68] bg-[#2b281f] px-4 py-3 text-sm leading-6 text-[#f4d4a9]"
                    >
                      Your session expired. Enter your workspace token again.
                    </p>
                  ) : null}

                  {connectError ? (
                    <p
                      role="alert"
                      className="mt-6 border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3 text-sm leading-6 text-[#f0b8ae]"
                    >
                      {connectError}
                    </p>
                  ) : null}

                  <div className="mt-8 grid gap-3">
                    <Label
                      htmlFor="railway-token"
                      className="uppercase tracking-[0.12em] text-[#c9c5b9]"
                    >
                      Workspace token
                    </Label>
                    <Input
                      id="railway-token"
                      name="token"
                      type="password"
                      required
                      autoComplete="off"
                      disabled={connectMutation.isPending}
                      spellCheck={false}
                      className="h-12 border-[#706d60] bg-[#141613] px-4 text-base text-[#f4f0e6] focus-visible:border-[#d59c55] focus-visible:ring-[#d59c55]/40"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={connectMutation.isPending}
                    className="mt-5 h-12 w-full bg-[#d59c55] px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#141613] hover:bg-[#e5ad68] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                  >
                    {connectMutation.isPending ? 'Connecting...' : 'Connect to Railway'}
                  </Button>

                  {connectMutation.isPending ? (
                    <p role="status" className="mt-4 text-sm text-[#c9c5b9]">
                      Railway is checking the token.
                    </p>
                  ) : null}
                </form>
              ) : (
                <section aria-labelledby="connected-title" className="w-full">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
                    Session / Ready
                  </p>
                  <h2 id="connected-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
                    Connected to Railway
                  </h2>
                  <p role="status" className="mt-4 leading-7 text-[#c9c5b9]">
                    Railway accepted your workspace token.
                  </p>

                  {disconnectMutation.isError ? (
                    <p
                      role="alert"
                      className="mt-6 border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3 text-sm leading-6 text-[#f0b8ae]"
                    >
                      {readErrorMessage(
                        disconnectMutation.error,
                        'Turntable could not sign out this browser. Try again.',
                      )}
                    </p>
                  ) : null}

                  <div className="mt-9 border-t border-[#706d60] pt-7">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate()}
                      className="h-12 w-full border-[#d59c55] bg-transparent px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#f4f0e6] hover:bg-[#d59c55] hover:text-[#141613] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                    >
                      {disconnectMutation.isPending ? 'Signing out...' : 'Sign out this browser'}
                    </Button>
                    <p className="mt-4 text-sm leading-6 text-[#a9a69c]">
                      This signs out this browser. If you think your token leaked,{' '}
                      <a
                        className="text-[#e5ad68] underline underline-offset-4 hover:text-[#f4f0e6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
                        href={railwayTokensUrl}
                      >
                        delete it on Railway
                      </a>
                      .
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative px-6 pb-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-[#8f8c81]">
        Unofficial. Not a Railway product.
      </footer>
    </div>
  )
}
