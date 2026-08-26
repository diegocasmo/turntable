import { ArrowSquareOutIcon } from '@phosphor-icons/react/ArrowSquareOut'
import { useForm } from '@tanstack/react-form'
import { useHydrated } from '@tanstack/react-router'
import type { SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { railwayTokensUrl } from '@/railway/urls'
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
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Step 01 / Connect
      </p>
      <h2 id="connect-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
        Connect to Railway
      </h2>
      <p className="mt-4 leading-7 text-foreground-soft">
        Create a token on{' '}
        <a
          className="text-warning underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
          const errorId = `${field.name}-error`

          return (
            <>
              <div className="mt-8 grid gap-3">
                <Label
                  htmlFor="railway-token"
                  className="uppercase tracking-[0.12em] text-foreground-soft"
                >
                  Railway API token
                </Label>
                <Input
                  id="railway-token"
                  type="password"
                  required
                  aria-describedby={validationError ? errorId : undefined}
                  aria-invalid={validationError ? true : undefined}
                  autoComplete="off"
                  disabled={!hydrated || session.isPending}
                  spellCheck={false}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    session.reset()
                    field.handleChange(event.target.value)
                  }}
                  className="h-12 border-border bg-background px-4 text-base text-foreground focus-visible:border-ring focus-visible:ring-ring/40"
                />
              </div>

              <Button
                type="submit"
                disabled={!hydrated || session.isPending}
                focusableWhenDisabled={session.isPending}
                size="lg"
                className="mt-5 w-full"
              >
                {session.isPending ? 'Connecting...' : 'Connect to Railway'}
              </Button>

              <div className="mt-4 min-h-12">
                {validationError ? (
                  <p id={errorId} role="alert" className="text-sm leading-6 text-danger-foreground">
                    {validationError.message}
                  </p>
                ) : null}
                {!validationError && session.error ? (
                  <p
                    role="alert"
                    className="border-l-2 border-destructive pl-3 text-sm leading-6 text-danger-foreground"
                  >
                    {session.error.message}
                  </p>
                ) : null}
                {!validationError && !session.error && expired ? (
                  <p
                    role="alert"
                    className="border-l-2 border-warning pl-3 text-sm leading-6 text-warning-foreground"
                  >
                    Your session expired. Enter your Railway API token again.
                  </p>
                ) : null}
                {!validationError && !session.error && !expired && session.isPending ? (
                  <p role="status" className="text-sm leading-6 text-foreground-soft">
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
