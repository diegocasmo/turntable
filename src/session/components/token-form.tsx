import { ArrowSquareOutIcon } from '@phosphor-icons/react/ArrowSquareOut'
import { WarningIcon } from '@phosphor-icons/react/Warning'
import { useForm } from '@tanstack/react-form'
import { useHydrated } from '@tanstack/react-router'
import { type SubmitEvent, useId, useRef } from 'react'
import { AsyncButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WarningNotice } from '@/components/ui/warning-notice'
import { railwayTokensUrl } from '@/railway/urls'
import { rejectedRailwayTokenMessage } from '@/session/connection-errors'
import { useConnectSession } from '@/session/hooks/use-connect-session'
import { type SessionNotice, sessionInputSchema } from '@/session/schema'

type TokenFormProps =
  | Readonly<{
      notice: SessionNotice
      onNoticeDismiss: () => Promise<void>
      onNoticeSubmit: () => Promise<void>
    }>
  | Readonly<{ notice?: undefined }>

const noticeContent: Record<SessionNotice, Readonly<{ message: string; title: string }>> = {
  expired: {
    message: 'Enter your Railway API token to reconnect.',
    title: 'Session expired',
  },
  'token-rejected': {
    message: 'Railway did not accept the previous token. Enter a valid token to reconnect.',
    title: 'Railway connection ended',
  },
}

function renderFeedback(
  tokenErrorMessage: string | undefined,
  error: Error | null,
  errorId: string,
  pending: boolean,
) {
  const hasAlert = Boolean(tokenErrorMessage) || error !== null
  const alertMessage = tokenErrorMessage || error?.message
  if (hasAlert) {
    return (
      <p
        id={tokenErrorMessage ? errorId : undefined}
        role="alert"
        className="flex min-h-12 items-center gap-3 border border-danger bg-danger-panel px-3 py-2 text-sm leading-5 text-danger-text"
      >
        <WarningIcon aria-hidden="true" className="size-4 shrink-0" weight="bold" />
        <span>{alertMessage}</span>
      </p>
    )
  }
  if (pending) {
    return (
      <p role="status" className="text-sm leading-6 text-text-soft">
        Railway is checking the token.
      </p>
    )
  }
  return null
}

export function TokenForm(props: TokenFormProps) {
  const hydrated = useHydrated()
  const session = useConnectSession()
  const pending = session.isPending
  const inputRef = useRef<HTMLInputElement>(null)
  const noticeDescriptionId = useId()
  const inputNoticeDescriptionId = props.notice ? noticeDescriptionId : undefined
  const form = useForm({
    defaultValues: { token: '' },
    onSubmit: ({ value }) => session.connect(value.token),
    validators: { onSubmit: sessionInputSchema },
  })

  async function handleNoticeDismiss() {
    if (!props.notice) return

    await props.onNoticeDismiss()
    inputRef.current?.focus({ preventScroll: true })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (props.notice) await props.onNoticeSubmit()
    await form.handleSubmit()
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

      {props.notice ? (
        <div className="mt-6">
          <WarningNotice
            descriptionId={noticeDescriptionId}
            message={noticeContent[props.notice].message}
            title={noticeContent[props.notice].title}
            urgency="assertive"
            onDismiss={() => void handleNoticeDismiss()}
          />
        </div>
      ) : null}

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
                  ref={inputRef}
                  id="railway-token"
                  type="password"
                  required
                  aria-describedby={tokenErrorMessage ? errorId : inputNoticeDescriptionId}
                  aria-invalid={tokenErrorMessage ? true : undefined}
                  autoComplete="off"
                  disabled={!hydrated || pending}
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
                pending={pending}
                size="lg"
                className="mt-5 w-full"
              >
                {pending ? 'Connecting...' : 'Connect to Railway'}
              </AsyncButton>
              <div className="mt-4 min-h-12">
                {renderFeedback(tokenErrorMessage, session.error, errorId, pending)}
              </div>
            </>
          )
        }}
      </form.Field>
    </form>
  )
}
