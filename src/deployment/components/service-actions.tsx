import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
  const [announcement, setAnnouncement] = useState('')
  const queryClient = useQueryClient()
  const deploymentId = deployment?.status === 'SUCCESS' ? deployment.id : null

  function handleRequestAccepted(
    action: AcceptedServiceOperation['action'],
    acceptedDeploymentId: string,
  ) {
    const label = action === 'spin-up' ? 'Spin up' : 'Spin down'
    setAnnouncement(`${label} request accepted for ${serviceName}.`)
    onOperationAccepted({ action, deploymentId: acceptedDeploymentId, serviceId: target.serviceId })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.services.list(target.projectId, target.environmentId),
    })
  }

  return (
    <div className="grid w-full gap-2 border-t border-border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SpinUpAction
          serviceName={serviceName}
          target={target}
          onRequestAccepted={(acceptedDeploymentId) =>
            handleRequestAccepted('spin-up', acceptedDeploymentId)
          }
        />
        <SpinDownAction
          deploymentId={deploymentId}
          serviceName={serviceName}
          onRequestAccepted={(acceptedDeploymentId) =>
            handleRequestAccepted('spin-down', acceptedDeploymentId)
          }
        />
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  )
}
