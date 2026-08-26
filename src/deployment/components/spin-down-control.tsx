import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Menu } from '@base-ui/react/menu'
import { ArrowClockwiseIcon } from '@phosphor-icons/react/ArrowClockwise'
import { CaretDownIcon } from '@phosphor-icons/react/CaretDown'
import { CircleNotchIcon } from '@phosphor-icons/react/CircleNotch'
import { PowerIcon } from '@phosphor-icons/react/Power'
import { RocketLaunchIcon } from '@phosphor-icons/react/RocketLaunch'
import { useRef, useState } from 'react'
import { AsyncButton, Button } from '@/components/ui/button'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'
import { useSpinUpDeployment } from '@/deployment/hooks/use-spin-up-deployment'
import type { DeploymentTarget } from '@/deployment/schema'
import { cn } from '@/lib/utils'

type DeploymentActionsProps = Readonly<{
  busy: boolean
  deploymentId?: string | undefined
  onDeploymentCreated: (deploymentId: string) => void
  onRefresh: () => void
  refreshLabel: 'Reconnect' | 'Refresh'
  target: DeploymentTarget | undefined
}>
type DeploymentAction = 'Spin down' | 'Spin up'

const menuItemClassName =
  'grid cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-foreground outline-none data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground [&_svg]:size-4'

export function DeploymentActions(props: DeploymentActionsProps) {
  const spinUp = useSpinUpDeployment(props.onDeploymentCreated)
  const spinDown = useSpinDownDeployment()
  const [action, setAction] = useState<DeploymentAction | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const pending = props.busy || spinUp.isPending || spinDown.isPending
  const dialogPending = action === 'Spin up' ? spinUp.isPending : spinDown.isPending
  const dialogError = action === 'Spin up' ? spinUp.error : spinDown.error
  const description =
    action === 'Spin up'
      ? 'This starts a new deployment. If a container is running, Railway replaces it.'
      : 'This removes the running container. The service configuration stays in Railway.'

  function openAction(nextAction: DeploymentAction) {
    if (nextAction === 'Spin up') spinUp.reset()
    else spinDown.reset()
    setAction(nextAction)
  }

  function handleConfirm() {
    const onSuccess = () => setAction(null)
    if (action === 'Spin up' && props.target) spinUp.mutate(props.target, { onSuccess })
    if (action === 'Spin down' && props.deploymentId) {
      spinDown.mutate({ deploymentId: props.deploymentId }, { onSuccess })
    }
  }

  return (
    <div ref={portalRef} className="contents">
      <Menu.Root>
        <Menu.Trigger
          disabled={props.target === undefined || pending}
          render={<AsyncButton className="w-28" pending={pending} size="sm" variant="secondary" />}
        >
          Actions
          {pending ? (
            <span className="motion-safe:animate-spin">
              <CircleNotchIcon aria-hidden="true" weight="bold" />
            </span>
          ) : (
            <CaretDownIcon aria-hidden="true" weight="bold" />
          )}
        </Menu.Trigger>
        <Menu.Portal container={portalRef}>
          <Menu.Positioner align="end" className="z-30" sideOffset={8}>
            <Menu.Popup className="min-w-[var(--anchor-width)] border border-border bg-popover shadow-[5px_5px_0_var(--shadow-color)] outline-none">
              <Menu.Item className={menuItemClassName} onClick={props.onRefresh}>
                <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
                {props.refreshLabel}
              </Menu.Item>
              <Menu.Item className={menuItemClassName} onClick={() => openAction('Spin up')}>
                <RocketLaunchIcon aria-hidden="true" weight="bold" />
                Spin up
              </Menu.Item>
              {props.deploymentId === undefined ? null : (
                <Menu.Item
                  className={cn(
                    menuItemClassName,
                    'border-t border-border text-danger-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground',
                  )}
                  onClick={() => openAction('Spin down')}
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
          <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-[var(--shadow-color)]/80 transition-opacity duration-150 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup
            className="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 gap-6 border border-border bg-card p-6 text-foreground shadow-[10px_10px_0_var(--shadow-color)] transition-[scale,opacity] duration-100 motion-reduce:transition-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
            initialFocus={dialogPending ? false : cancelRef}
          >
            <div className="grid gap-2">
              <AlertDialog.Title className="text-xl font-medium">
                {action} deployment?
              </AlertDialog.Title>
              <AlertDialog.Description
                className={cn(
                  'h-12 overflow-auto text-sm leading-6 text-foreground-soft',
                  dialogError && 'text-danger-foreground',
                )}
                role={dialogError ? 'alert' : 'status'}
              >
                {dialogError?.message ??
                  (dialogPending
                    ? `Railway is ${action === 'Spin up' ? 'starting' : 'stopping'}…`
                    : description)}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close
                disabled={dialogPending}
                render={<Button ref={cancelRef} className="w-20" variant="secondary" />}
              >
                Cancel
              </AlertDialog.Close>
              <AsyncButton
                className="w-28"
                pending={dialogPending}
                variant={action === 'Spin down' ? 'destructiveConfirm' : 'primary'}
                onClick={handleConfirm}
              >
                {action}
              </AsyncButton>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
