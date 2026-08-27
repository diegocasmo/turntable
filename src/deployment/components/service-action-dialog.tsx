import { AlertDialog } from '@base-ui/react/alert-dialog'
import { CircleNotchIcon } from '@phosphor-icons/react/CircleNotch'
import { useRef } from 'react'
import { AsyncButton, Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ServiceActionDialogProps = Readonly<{
  description: string
  error: Error | null
  label: string
  open: boolean
  pending: boolean
  pendingLabel: string
  serviceName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  destructive?: boolean
  disabled?: boolean
  disabledDescriptionId?: string
}>

export function ServiceActionDialog({
  description,
  error,
  label,
  open,
  pending,
  pendingLabel,
  serviceName,
  onConfirm,
  onOpenChange,
  destructive = false,
  disabled = false,
  disabledDescriptionId,
}: ServiceActionDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger
        aria-describedby={disabledDescriptionId}
        aria-label={`${label} ${serviceName}`}
        disabled={disabled}
        render={
          <Button
            ref={triggerRef}
            className="min-h-11 w-full"
            focusableWhenDisabled={disabled}
            variant={destructive ? 'destructive' : 'secondary'}
          />
        }
      >
        {label}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-[var(--shadow-color)]/80 transition-opacity duration-150 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-3rem)] w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto border border-border bg-card p-6 text-foreground shadow-[10px_10px_0_var(--shadow-color)] transition-[scale,opacity] duration-100 motion-reduce:transition-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
          initialFocus={pending ? false : cancelRef}
          finalFocus={triggerRef}
        >
          <div className="grid gap-2">
            <AlertDialog.Title className="text-xl font-medium">
              {label} deployment?
            </AlertDialog.Title>
            <AlertDialog.Description
              className={cn(
                'min-h-12 text-sm leading-6 text-foreground-soft',
                error && 'text-danger-foreground',
              )}
              role={error ? 'alert' : undefined}
            >
              {error?.message ?? description}
            </AlertDialog.Description>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AlertDialog.Close
              disabled={pending}
              render={<Button ref={cancelRef} className="w-full" variant="secondary" />}
            >
              Cancel
            </AlertDialog.Close>
            <AsyncButton
              aria-label={pending ? pendingLabel : `${label} ${serviceName}`}
              className="w-full"
              disabled={disabled}
              pending={pending}
              variant={destructive ? 'destructiveConfirm' : 'primary'}
              onClick={onConfirm}
            >
              {pending ? (
                <>
                  <CircleNotchIcon
                    aria-hidden="true"
                    className="motion-safe:animate-spin"
                    weight="bold"
                  />
                  {pendingLabel}
                </>
              ) : (
                label
              )}
            </AsyncButton>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
