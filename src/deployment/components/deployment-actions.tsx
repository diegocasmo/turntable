import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Menu } from '@base-ui/react/menu'
import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CircleNotchIcon,
  PowerIcon,
  RocketLaunchIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'
import { useSpinUpDeployment } from '@/deployment/hooks/use-spin-up-deployment'
import type { DeploymentTarget } from '@/deployment/schema'
import { cn } from '@/lib/utils'

type DeploymentActionsProps = Readonly<{
  busy: boolean
  deploymentId?: string | undefined
  disabled: boolean
  onDeploymentCreated: (deploymentId: string) => void
  onRefresh: () => void
  refreshLabel: 'Reconnect' | 'Refresh'
  running: boolean | undefined
  target: DeploymentTarget | undefined
}>
type DeploymentAction = 'Spin down' | 'Spin up'

const menuItemClassName =
  'grid cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#f4f0e6] outline-none data-[highlighted]:bg-[#d59c55] data-[highlighted]:text-[#141613] [&_svg]:size-4'

export function DeploymentActions(props: DeploymentActionsProps) {
  const spinUp = useSpinUpDeployment(props.onDeploymentCreated)
  const spinDown = useSpinDownDeployment()
  const [action, setAction] = useState<DeploymentAction | null>(null)
  const pending = props.busy || spinUp.isPending || spinDown.isPending
  const dialogPending = action === 'Spin up' ? spinUp.isPending : spinDown.isPending
  const dialogError = action === 'Spin up' ? spinUp.error : spinDown.error
  let spinUpDescription = 'This starts a new deployment for this service.'
  if (props.running) {
    spinUpDescription = 'This starts a new deployment and replaces the running container.'
  } else if (props.running === undefined) {
    spinUpDescription =
      'This starts a new deployment. If a container is running, Railway replaces it.'
  }
  const description =
    action === 'Spin down'
      ? 'This removes the running container. The service configuration stays in Railway.'
      : spinUpDescription

  function handleConfirm() {
    if (action === 'Spin up' && props.target) {
      spinUp.mutate(props.target, { onSuccess: () => setAction(null) })
    }
    if (action === 'Spin down' && props.deploymentId) {
      spinDown.mutate({ deploymentId: props.deploymentId }, { onSuccess: () => setAction(null) })
    }
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-busy={pending || undefined}
          className={buttonVariants({ className: 'w-28', size: 'sm', variant: 'secondary' })}
          disabled={props.disabled || pending}
        >
          Actions
          {pending ? (
            <CircleNotchIcon aria-hidden="true" className="animate-spin" weight="bold" />
          ) : (
            <CaretDownIcon aria-hidden="true" weight="bold" />
          )}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" className="z-30" sideOffset={8}>
            <Menu.Popup className="min-w-[var(--anchor-width)] border border-[#706d60] bg-[#242522] shadow-[5px_5px_0_#090a08] outline-none">
              <Menu.Item className={menuItemClassName} onClick={props.onRefresh}>
                <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
                {props.refreshLabel}
              </Menu.Item>
              <Menu.Item
                className={menuItemClassName}
                onClick={() => {
                  spinUp.reset()
                  setAction('Spin up')
                }}
              >
                <RocketLaunchIcon aria-hidden="true" weight="bold" />
                Spin up
              </Menu.Item>
              {props.deploymentId === undefined ? null : (
                <Menu.Item
                  className={cn(
                    menuItemClassName,
                    'border-t border-[#706d60] text-[#f0b8ae] data-[highlighted]:bg-[#d97767] data-[highlighted]:text-[#141613]',
                  )}
                  onClick={() => {
                    spinDown.reset()
                    setAction('Spin down')
                  }}
                >
                  <PowerIcon aria-hidden="true" weight="bold" />
                  Spin down
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <AlertDialog.Root
        open={action !== null}
        onOpenChange={(open) => !open && !dialogPending && setAction(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-[#090a08]/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 gap-6 border border-[#706d60] bg-[#1d201c] p-6 text-[#f4f0e6] shadow-[10px_10px_0_#090a08] transition-[scale,opacity] duration-100 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="grid gap-2">
              <AlertDialog.Title className="text-xl font-medium">
                {action} deployment?
              </AlertDialog.Title>
              <AlertDialog.Description
                aria-live="polite"
                className="h-12 overflow-auto text-sm leading-6 text-[#c9c5b9]"
                role={dialogError ? 'alert' : undefined}
              >
                {dialogError?.message ??
                  (dialogPending
                    ? `Railway is ${action === 'Spin up' ? 'starting' : 'stopping'}…`
                    : description)}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close
                className={buttonVariants({ className: 'w-20', variant: 'secondary' })}
                disabled={dialogPending}
              >
                Cancel
              </AlertDialog.Close>
              <Button
                aria-busy={dialogPending || undefined}
                className="w-28"
                disabled={dialogPending}
                variant={action === 'Spin down' ? 'destructiveConfirm' : 'primary'}
                onClick={handleConfirm}
              >
                {action}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
