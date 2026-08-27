import { useState } from 'react'
import { ServiceActionDialog } from '@/deployment/components/service-action-dialog'
import { useSpinDownDeployment } from '@/deployment/hooks/use-spin-down-deployment'

type SpinDownActionProps = Readonly<{
  deploymentId: string | null
  serviceName: string
  onRequestAccepted: (deploymentId: string) => void
}>

export function SpinDownAction({
  deploymentId,
  serviceName,
  onRequestAccepted,
}: SpinDownActionProps) {
  const [open, setOpen] = useState(false)
  const spinDown = useSpinDownDeployment((acceptedDeploymentId) => {
    onRequestAccepted(acceptedDeploymentId)
    setOpen(false)
  })

  return (
    <ServiceActionDialog
      destructive
      description={
        deploymentId
          ? 'This removes the running container. The service configuration stays in Railway.'
          : 'Spin down requires a successful deployment.'
      }
      disabled={!deploymentId}
      error={spinDown.error}
      label="Spin down"
      open={open}
      pending={spinDown.isPending}
      pendingLabel="Spinning down..."
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
