import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { DeploymentActions } from '@/deployment/components/spin-down-control'
import type { DeploymentTarget } from '@/deployment/schema'
import type { DeploymentStatus } from '@/railway/deployment-status'
import { selectionQueryKeys } from '@/selection/query-options'

type ServiceActionsMenuProps = Readonly<{
  deployment: Readonly<{ id: string; status: DeploymentStatus }> | null
  serviceName: string
  target: DeploymentTarget
}>

export function ServiceActionsMenu({ deployment, serviceName, target }: ServiceActionsMenuProps) {
  const [announcement, setAnnouncement] = useState('')
  const [syncError, setSyncError] = useState<Error | null>(null)
  const queryClient = useQueryClient()

  async function refreshServicesAfterAction(action: 'Spin down' | 'Spin up') {
    setAnnouncement('')
    setSyncError(null)
    try {
      await queryClient.invalidateQueries(
        {
          queryKey: selectionQueryKeys.services(target.projectId, target.environmentId),
        },
        { throwOnError: true },
      )
      setAnnouncement(`${action} completed for ${serviceName}. Service status updated.`)
    } catch {
      setSyncError(
        new Error(
          `${action} completed, but Turntable could not update ${serviceName}. Reload the page.`,
        ),
      )
    }
  }

  return (
    <div className="grid max-w-48 justify-items-end gap-2">
      <DeploymentActions
        deploymentId={deployment?.status === 'SUCCESS' ? deployment.id : undefined}
        target={target}
        triggerLabel={`Actions for ${serviceName}`}
        triggerText="More"
        onActionSuccess={refreshServicesAfterAction}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      {syncError ? (
        <p className="text-right text-xs leading-5 text-danger-foreground" role="alert">
          {syncError.message}
        </p>
      ) : null}
    </div>
  )
}
