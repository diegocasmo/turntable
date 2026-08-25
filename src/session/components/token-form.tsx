import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useForm } from '@tanstack/react-form'
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
    <form aria-labelledby="connect-title" className="w-full" onSubmit={handleSubmit}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
        Step 01 / Connect
      </p>
      <h2 id="connect-title" className="mt-4 text-3xl leading-tight sm:text-4xl">
        Connect to Railway
      </h2>
      <p className="mt-4 leading-7 text-[#c9c5b9]">
        Create a token on{' '}
        <a
          className="text-[#e5ad68] underline underline-offset-4 hover:text-[#f4f0e6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
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

      {expired ? (
        <p
          role="alert"
          className="mt-6 border-l-2 border-[#e5ad68] bg-[#2b281f] px-4 py-3 text-sm leading-6 text-[#f4d4a9]"
        >
          Your session expired. Enter your Railway API token again.
        </p>
      ) : null}

      {session.error ? (
        <p
          role="alert"
          className="mt-6 border-l-2 border-[#d97767] bg-[#2d201e] px-4 py-3 text-sm leading-6 text-[#f0b8ae]"
        >
          {session.error.message}
        </p>
      ) : null}

      <form.Field name="token">
        {(field) => {
          const validationError = field.state.meta.errors[0]
          const errorId = `${field.name}-error`

          return (
            <div className="mt-8 grid gap-3">
              <Label htmlFor="railway-token" className="uppercase tracking-[0.12em] text-[#c9c5b9]">
                Railway API token
              </Label>
              <Input
                id="railway-token"
                name={field.name}
                type="password"
                required
                aria-describedby={validationError ? errorId : undefined}
                aria-invalid={validationError ? true : undefined}
                autoComplete="off"
                disabled={session.isPending}
                spellCheck={false}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  session.reset()
                  field.handleChange(event.target.value)
                }}
                className="h-12 border-[#706d60] bg-[#141613] px-4 text-base text-[#f4f0e6] focus-visible:border-[#d59c55] focus-visible:ring-[#d59c55]/40"
              />
              {validationError ? (
                <p id={errorId} role="alert" className="text-sm leading-6 text-[#f0b8ae]">
                  {validationError.message}
                </p>
              ) : null}
            </div>
          )
        }}
      </form.Field>

      <Button
        type="submit"
        disabled={session.isPending}
        className="mt-5 h-12 w-full bg-[#d59c55] px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#141613] hover:bg-[#e5ad68] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55]"
      >
        {session.isPending ? 'Connecting...' : 'Connect to Railway'}
      </Button>

      {session.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#c9c5b9]">
          Railway is checking the token.
        </p>
      ) : null}
    </form>
  )
}
