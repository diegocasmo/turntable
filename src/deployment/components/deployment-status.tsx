import { Button } from '@/components/ui/button'
import { useReadCurrentDeployment } from '@/deployment/hooks/use-read-current-deployment'
import type { DeploymentTarget } from '@/deployment/schema'
import { formatDeploymentStatus } from '@/railway/deployment-status'

function resolveDeploymentStatusText(deployment: ReturnType<typeof useReadCurrentDeployment>) {
  if (!deployment.data) {
    return deployment.isPending ? 'Loading deployment.' : 'No deployment.'
  }

  return `Status: ${formatDeploymentStatus(deployment.data.status)}.`
}

export function DeploymentStatus(target: DeploymentTarget) {
  const deployment = useReadCurrentDeployment(target)
  const statusText = resolveDeploymentStatusText(deployment)

  return (
    <div className="border-t border-[#4d4e47] pt-4">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">
        Deployment / Current
      </p>
      {deployment.error ? (
        <div className="mt-3 border-l-2 border-[#d97767] pl-4">
          <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
            {deployment.error.message}
          </p>
          <Button type="button" className="mt-3" onClick={() => void deployment.refetch()}>
            Retry deployment status
          </Button>
        </div>
      ) : (
        <p
          aria-label="Deployment status"
          role="status"
          className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-[#d59c55]"
        >
          {statusText}
        </p>
      )}
    </div>
  )
}
