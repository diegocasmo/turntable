import { ArrowSquareOutIcon } from '@phosphor-icons/react/ArrowSquareOut'
import { WarningIcon } from '@phosphor-icons/react/Warning'
import { useForm } from '@tanstack/react-form'
import { useHydrated } from '@tanstack/react-router'
import type { SubmitEvent } from 'react'
import { AsyncButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { railwayTokensUrl } from '@/railway/urls'
import { rejectedRailwayTokenMessage } from '@/session/connection-errors'
import { useConnectSession } from '@/session/hooks/use-connect-session'
import { sessionInputSchema } from '@/session/schema'

type TokenFormProps = Readonly<{
  expired: boolean
}>

export function TokenForm({ expired }: TokenFormProps) {
  const hydrated = useHydrated()
  const session = useConnectSession()
  const form = useForm({
    defaultValues: { token: '' },
    onSubmit: ({ value }) => session.connect(value.token),
    validators: { onSubmit: sessionInputSchema },
  })

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form aria-labelledby="connect-title" className="w-full" method="post" onSubmit={handleSubmit}>
      <h2 id="connect-title" className="text-3xl leading-tight sm:text-4xl">
        Connect to Railway
      </h2>
      <p className="mt-4 leading-7 text-text-soft">
        Create a token on{' '}
        <a
          className="text-warning underline underline-offset-4 hover:text-text focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-focus focus-visible:outline-solid"
          href={railwayTokensUrl}
          rel="noreferrer"
          target="_blank"
        >
          Railway's token page
          <ArrowSquareOutIcon aria-hidden="true" className="ml-1 inline size-3 align-[-0.1em]" />{' '}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        .
      </p>

      <form.Field name="token">
        {(field) => {
          const validationError = field.state.meta.errors[0]
          const tokenRejected = session.error?.message === rejectedRailwayTokenMessage
          const tokenErrorMessage =
            validationError?.message ?? (tokenRejected ? rejectedRailwayTokenMessage : undefined)
          const errorId = `${field.name}-error`

          return (
            <>
              <div className="mt-8 grid gap-3">
                <Label
                  htmlFor="railway-token"
                  className="uppercase tracking-[0.12em] text-text-soft"
                >
                  Railway API token
                </Label>
                <Input
                  id="railway-token"
                  type="password"
                  required
                  aria-describedby={tokenErrorMessage ? errorId : undefined}
                  aria-invalid={tokenErrorMessage ? true : undefined}
                  autoComplete="off"
                  disabled={!hydrated || session.isPending}
                  spellCheck={false}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    session.reset()
                    field.handleChange(event.target.value)
                  }}
                  className="h-12 border-border bg-canvas px-4 text-base text-text focus-visible:border-focus focus-visible:ring-focus"
                />
              </div>

              <AsyncButton
                type="submit"
                disabled={!hydrated}
                pending={session.isPending}
                size="lg"
                className="mt-5 w-full"
              >
                {session.isPending ? 'Connecting...' : 'Connect to Railway'}
              </AsyncButton>

              <div className="mt-4 min-h-12">
                {tokenErrorMessage ? (
                  <p
                    id={errorId}
                    role="alert"
                    className="flex min-h-12 items-center gap-3 border border-danger bg-danger-panel px-3 py-2 text-sm leading-5 text-danger-text"
                  >
                    <WarningIcon aria-hidden="true" className="size-4 shrink-0" weight="bold" />
                    <span>{tokenErrorMessage}</span>
                  </p>
                ) : null}
                {!tokenErrorMessage && session.error ? (
                  <p
                    role="alert"
                    className="flex min-h-12 items-center gap-3 border border-danger bg-danger-panel px-3 py-2 text-sm leading-5 text-danger-text"
                  >
                    <WarningIcon aria-hidden="true" className="size-4 shrink-0" weight="bold" />
                    <span>{session.error.message}</span>
                  </p>
                ) : null}
                {!tokenErrorMessage && !session.error && expired ? (
                  <p
                    role="alert"
                    className="border-l-2 border-warning pl-3 text-sm leading-6 text-warning-text"
                  >
                    Your session expired. Enter your Railway API token again.
                  </p>
                ) : null}
                {!tokenErrorMessage && !session.error && !expired && session.isPending ? (
                  <p role="status" className="text-sm leading-6 text-text-soft">
                    Railway is checking the token.
                  </p>
                ) : null}
              </div>
            </>
          )
        }}
      </form.Field>
    </form>
  )
}
