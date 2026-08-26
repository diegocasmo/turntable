import { AlertDialog } from '@base-ui/react/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'
import { cn } from '@/lib/utils'

type SpinDownControlProps = Readonly<{
  deploymentId: string
}>

const actionClassName = 'px-3 font-mono uppercase tracking-[0.08em]'
const outlineButtonClassName = buttonVariants({ size: 'sm', variant: 'outline' })
const triggerClassName = cn(
  outlineButtonClassName,
  actionClassName,
  'border-[#d97767] bg-transparent text-[#f0b8ae] hover:bg-[#2d201e] hover:text-[#f0b8ae]',
)
const cancelClassName = cn(
  outlineButtonClassName,
  actionClassName,
  'border-[#706d60] bg-transparent text-[#c9c5b9] hover:border-[#c9c5b9] hover:bg-[#242522] hover:text-[#f4f0e6]',
)
const confirmClassName = cn(
  outlineButtonClassName,
  actionClassName,
  'border-[#d97767] bg-[#d97767] text-[#141613] hover:bg-[#f0b8ae] hover:text-[#141613]',
)

export function SpinDownControl({ deploymentId }: SpinDownControlProps) {
  const spinDown = useSpinDownDeployment()

  return (
    <div className="grid justify-items-end gap-2">
      <AlertDialog.Root onOpenChange={(open) => open && spinDown.reset()}>
        <AlertDialog.Trigger
          aria-describedby={spinDown.error ? 'spin-down-error' : undefined}
          className={triggerClassName}
          disabled={spinDown.isPending}
        >
          {spinDown.isPending ? 'Spinning down…' : 'Spin down'}
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
