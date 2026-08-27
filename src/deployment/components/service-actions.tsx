import { AlertDialog } from '@base-ui/react/alert-dialog'
import { CircleNotchIcon } from '@phosphor-icons/react/CircleNotch'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { AsyncButton, Button } from '@/components/ui/button'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'
import { useSpinUpDeployment } from '@/deployment/hooks/use-spin-up-deployment'
import type { DeploymentTarget } from '@/deployment/schema'
import { cn } from '@/lib/utils'
import type { DeploymentStatus } from '@/railway/deployment-status'
import { selectionQueryKeys } from '@/selection/query-options'

type DeploymentAction = 'Spin down' | 'Spin up'

export type AcceptedServiceOperation = Readonly<{
  action: 'spin-down' | 'spin-up'
  deploymentId: string
  serviceId: string
}>

type ActionDialogProps = Readonly<{
  action: DeploymentAction
  description: string
  error: Error | null
  open: boolean
  pending: boolean
  serviceName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  disabledDescriptionId?: string
}>

type ServiceActionsProps = Readonly<{
  deployment: Readonly<{ id: string; status: DeploymentStatus }> | null
  onOperationAccepted: (operation: AcceptedServiceOperation) => void
  serviceName: string
  target: DeploymentTarget
}>

function DeploymentActionDialog({
  action,
  description,
  error,
  open,
  pending,
  serviceName,
  onConfirm,
  onOpenChange,
  disabled = false,
  disabledDescriptionId,
}: ActionDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pendingLabel = action === 'Spin up' ? 'Spinning up...' : 'Spinning down...'

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger
        aria-describedby={disabledDescriptionId}
        aria-label={`${action} ${serviceName}`}
        disabled={disabled}
        render={
          <Button
            ref={triggerRef}
            className="min-h-11 w-full"
            focusableWhenDisabled={disabled}
            variant={action === 'Spin down' ? 'destructive' : 'secondary'}
          />
        }
      >
        {action}
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
              {action} deployment?
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
              aria-label={pending ? pendingLabel : `${action} ${serviceName}`}
              className="w-full"
              disabled={disabled}
              pending={pending}
              variant={action === 'Spin down' ? 'destructiveConfirm' : 'primary'}
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
                action
              )}
            </AsyncButton>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function SpinUpAction({
  serviceName,
  target,
  onRequestAccepted,
}: Readonly<{
  serviceName: string
  target: DeploymentTarget
  onRequestAccepted: (operation: AcceptedServiceOperation) => void
}>) {
  const [open, setOpen] = useState(false)
  const spinUp = useSpinUpDeployment((deploymentId) => {
    onRequestAccepted({
      action: 'spin-up',
      deploymentId,
      serviceId: target.serviceId,
    })
    setOpen(false)
  })

  return (
    <DeploymentActionDialog
      action="Spin up"
      description="This starts a new deployment. If a container is running, Railway replaces it."
      error={spinUp.error}
      open={open}
      pending={spinUp.isPending}
      serviceName={serviceName}
      onConfirm={() => spinUp.mutate(target)}
      onOpenChange={(nextOpen) => {
        if (nextOpen) spinUp.reset()
        if (!spinUp.isPending) setOpen(nextOpen)
      }}
    />
  )
}

function SpinDownAction({
  deploymentId,
  serviceName,
  targetServiceId,
  unavailableDescriptionId,
  onRequestAccepted,
}: Readonly<{
  deploymentId: string | null
  serviceName: string
  targetServiceId: string
  unavailableDescriptionId: string
  onRequestAccepted: (operation: AcceptedServiceOperation) => void
}>) {
  const [open, setOpen] = useState(false)
  const spinDown = useSpinDownDeployment(() => {
    if (deploymentId) {
      onRequestAccepted({
        action: 'spin-down',
        deploymentId,
        serviceId: targetServiceId,
      })
    }
    setOpen(false)
  })

  return (
    <DeploymentActionDialog
      action="Spin down"
      description={
        deploymentId
          ? 'This removes the running container. The service configuration stays in Railway.'
          : 'Spin down is no longer available because there is no successful deployment.'
      }
      disabled={!deploymentId}
      disabledDescriptionId={unavailableDescriptionId}
      error={spinDown.error}
      open={open}
      pending={spinDown.isPending}
      serviceName={serviceName}
      onConfirm={() => {
        if (deploymentId) spinDown.mutate({ deploymentId })
      }}
      onOpenChange={(nextOpen) => {
        if (nextOpen) spinDown.reset()
        if (!spinDown.isPending) setOpen(nextOpen)
      }}
    />
  )
}

export function ServiceActions({
  deployment,
  onOperationAccepted,
  serviceName,
  target,
}: ServiceActionsProps) {
  const unavailableDescriptionId = useId()
  const [announcement, setAnnouncement] = useState('')
  const queryClient = useQueryClient()
  const deploymentId = deployment?.status === 'SUCCESS' ? deployment.id : null

  function handleRequestAccepted(operation: AcceptedServiceOperation) {
    const action = operation.action === 'spin-up' ? 'Spin up' : 'Spin down'
    setAnnouncement(`${action} request accepted for ${serviceName}.`)
    onOperationAccepted(operation)
    void queryClient.invalidateQueries({
      queryKey: selectionQueryKeys.services(target.projectId, target.environmentId),
    })
  }

  return (
    <div className="grid w-full gap-2 border-t border-border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SpinUpAction
          serviceName={serviceName}
          target={target}
          onRequestAccepted={handleRequestAccepted}
        />
        <SpinDownAction
          deploymentId={deploymentId}
          serviceName={serviceName}
          targetServiceId={target.serviceId}
          unavailableDescriptionId={unavailableDescriptionId}
          onRequestAccepted={handleRequestAccepted}
        />
      </div>
      <p id={unavailableDescriptionId} className="min-h-5 text-xs leading-5 text-foreground-soft">
        {deploymentId ? '' : 'Spin down requires a successful deployment.'}
      </p>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  )
}
