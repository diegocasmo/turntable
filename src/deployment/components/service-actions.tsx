import { useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { SpinDownAction } from '@/deployment/components/spin-down-action'
import { SpinUpAction } from '@/deployment/components/spin-up-action'
import type { DeploymentTarget } from '@/deployment/schema'
import { queryKeys } from '@/query-keys'
import type { DeploymentStatus } from '@/railway/deployment-status'

export type AcceptedServiceOperation = Readonly<{
  action: 'spin-down' | 'spin-up'
  deploymentId: string
  serviceId: string
}>

type ServiceActionsProps = Readonly<{
  deployment: Readonly<{ id: string; status: DeploymentStatus }> | null
  onOperationAccepted: (operation: AcceptedServiceOperation) => void
  serviceName: string
  target: DeploymentTarget
}>

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
      queryKey: queryKeys.services.list(target.projectId, target.environmentId),
    })
  }

  function handleSpinUpAccepted(acceptedDeploymentId: string) {
    handleRequestAccepted({
      action: 'spin-up',
      deploymentId: acceptedDeploymentId,
      serviceId: target.serviceId,
    })
  }

  function handleSpinDownAccepted(acceptedDeploymentId: string) {
    handleRequestAccepted({
      action: 'spin-down',
      deploymentId: acceptedDeploymentId,
      serviceId: target.serviceId,
    })
  }

  return (
    <div className="grid w-full gap-2 border-t border-border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SpinUpAction
          serviceName={serviceName}
          target={target}
          onRequestAccepted={handleSpinUpAccepted}
        />
        <SpinDownAction
          deploymentId={deploymentId}
          serviceName={serviceName}
          unavailableDescriptionId={unavailableDescriptionId}
          onRequestAccepted={handleSpinDownAccepted}
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
