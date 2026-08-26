import { AlertDialog } from '@base-ui/react/alert-dialog'
import { CircleNotchIcon, PowerIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'

type SpinDownControlProps = Readonly<{
  deploymentId: string
}>

const triggerClassName = buttonVariants({ variant: 'destructive' })
const cancelClassName = buttonVariants({ variant: 'secondary' })
const confirmClassName = buttonVariants({ variant: 'destructiveConfirm' })

export function SpinDownControl({ deploymentId }: SpinDownControlProps) {
  const spinDown = useSpinDownDeployment()

  return (
    <div className="grid justify-items-end gap-2">
      <AlertDialog.Root onOpenChange={(open) => open && spinDown.reset()}>
        <AlertDialog.Trigger
          aria-busy={spinDown.isPending || undefined}
          aria-describedby={spinDown.error ? 'spin-down-error' : undefined}
          aria-label={spinDown.isPending ? 'Spinning down…' : undefined}
          className={triggerClassName}
          disabled={spinDown.isPending}
        >
          {spinDown.isPending ? (
            <CircleNotchIcon aria-hidden="true" className="animate-spin" weight="bold" />
          ) : (
            <PowerIcon aria-hidden="true" weight="bold" />
          )}
          Spin down
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-[#090a08]/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 gap-6 border border-[#706d60] bg-[#1d201c] p-6 text-[#f4f0e6] shadow-[10px_10px_0_#090a08] transition-[scale,opacity] duration-100 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="grid gap-2">
              <AlertDialog.Title className="text-xl font-medium">
                Spin down deployment?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm leading-6 text-[#c9c5b9]">
                This removes the running container. The service configuration stays in Railway.
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className={cancelClassName}>Cancel</AlertDialog.Close>
              <AlertDialog.Close
                className={confirmClassName}
                onClick={() => spinDown.mutate({ deploymentId })}
              >
                Spin down
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {spinDown.error ? (
        <p id="spin-down-error" role="alert" className="max-w-72 text-right text-sm text-[#f0b8ae]">
          {spinDown.error.message}
        </p>
      ) : null}
    </div>
  )
}
