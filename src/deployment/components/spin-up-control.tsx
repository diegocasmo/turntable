import { AlertDialog } from '@base-ui/react/alert-dialog'
import { CircleNotchIcon, RocketLaunchIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { useSpinUpDeployment } from '@/deployment/hooks/use-spin-up-deployment'
import type { DeploymentTarget } from '@/deployment/schema'

type SpinUpControlProps = Readonly<{
  disabled: boolean
  onDeploymentCreated: (deploymentId: string) => void
  pending: boolean
  running: boolean | undefined
  target: DeploymentTarget
}>

const triggerClassName = buttonVariants({ variant: 'primary' })
const cancelClassName = buttonVariants({ variant: 'secondary' })
const confirmClassName = buttonVariants({ variant: 'primary' })

export function SpinUpControl({
  disabled,
  onDeploymentCreated,
  pending,
  running,
  target,
}: SpinUpControlProps) {
  const spinUp = useSpinUpDeployment(onDeploymentCreated)
  let description = 'This starts a new deployment for this service.'
  if (running === true) {
    description = 'This starts a new deployment and replaces the running container.'
  } else if (running === undefined) {
    description = 'This starts a new deployment. If a container is running, Railway replaces it.'
  }

  return (
    <div className="grid justify-items-end gap-2">
      <AlertDialog.Root onOpenChange={(open) => open && spinUp.reset()}>
        <AlertDialog.Trigger
          aria-busy={pending || spinUp.isPending || undefined}
          aria-describedby={spinUp.error ? 'spin-up-error' : undefined}
          aria-label={pending || spinUp.isPending ? 'Spinning up…' : undefined}
          className={triggerClassName}
          disabled={disabled || spinUp.isPending}
        >
          {pending || spinUp.isPending ? (
            <CircleNotchIcon aria-hidden="true" className="animate-spin" weight="bold" />
          ) : (
            <RocketLaunchIcon aria-hidden="true" weight="bold" />
          )}
          Spin up
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-[#090a08]/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 gap-6 border border-[#706d60] bg-[#1d201c] p-6 text-[#f4f0e6] shadow-[10px_10px_0_#090a08] transition-[scale,opacity] duration-100 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="grid gap-2">
              <AlertDialog.Title className="text-xl font-medium">
                Spin up deployment?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm leading-6 text-[#c9c5b9]">
                {description}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className={cancelClassName}>Cancel</AlertDialog.Close>
              <AlertDialog.Close className={confirmClassName} onClick={() => spinUp.mutate(target)}>
                Spin up
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {spinUp.error ? (
        <p id="spin-up-error" role="alert" className="max-w-72 text-right text-sm text-[#f0b8ae]">
          {spinUp.error.message}
        </p>
      ) : null}
    </div>
  )
}
