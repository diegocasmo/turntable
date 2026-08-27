import { useState } from 'react'
import { ServiceActionDialog } from '@/deployment/components/service-action-dialog'
import { useSpinUpDeployment } from '@/deployment/hooks/use-spin-up-deployment'
import type { DeploymentTarget } from '@/deployment/schema'

type SpinUpActionProps = Readonly<{
  serviceName: string
  target: DeploymentTarget
  onRequestAccepted: (deploymentId: string) => void
}>

export function SpinUpAction({ serviceName, target, onRequestAccepted }: SpinUpActionProps) {
  const [open, setOpen] = useState(false)
  const spinUp = useSpinUpDeployment((deploymentId) => {
    onRequestAccepted(deploymentId)
    setOpen(false)
  })

  return (
    <ServiceActionDialog
      description="This starts a new deployment. If a container is running, Railway replaces it."
      error={spinUp.error}
      label="Spin up"
      open={open}
      pending={spinUp.isPending}
      pendingLabel="Spinning up..."
      serviceName={serviceName}
      onConfirm={() => spinUp.mutate(target)}
      onOpenChange={(nextOpen) => {
        if (nextOpen) spinUp.reset()
        if (!spinUp.isPending) setOpen(nextOpen)
      }}
    />
  )
}
