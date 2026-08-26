import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/deployment/components/status-badge'
import { useReadCurrentDeployment } from '@/deployment/hooks/use-read-current-deployment'
import type { DeploymentTarget } from '@/deployment/schema'

type DeploymentStatusProps = Readonly<{
  selectionFailure: Readonly<{ message: string; retry: () => void }> | undefined
  target: DeploymentTarget | undefined
}>

const deploymentStatusLabel = 'Deployment status'

function DeploymentStatusContent({ selectionFailure, target }: DeploymentStatusProps) {
  const deployment = useReadCurrentDeployment(target)
  const failure =
    selectionFailure ??
    (deployment.error
      ? { message: deployment.error.message, retry: () => void deployment.refetch() }
      : undefined)

  if (failure) {
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-l-2 border-[#d97767] bg-[#2d201e] px-3">
        <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
          {failure.message}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[#d97767] bg-transparent text-[#f0b8ae]"
          onClick={failure.retry}
        >
          Retry
        </Button>
      </div>
    )
  }

  let status: ReactNode
  if (target === undefined) {
    status = <span className="text-sm text-[#c9c5b9]">Choose a service</span>
  } else if (deployment.isPending) {
    status = (
      <>
        <span className="sr-only">Loading deployment.</span>
        <span
          aria-hidden="true"
          className="block h-5 w-28 bg-[#4d4e47] motion-safe:animate-pulse"
        />
      </>
    )
  } else {
    status = <StatusBadge status={deployment.data?.status ?? null} />
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">
        {deploymentStatusLabel}
      </p>
      {status}
    </div>
  )
}

export function DeploymentStatus(props: DeploymentStatusProps) {
  return (
    <section aria-label={deploymentStatusLabel} className="border-t border-[#4d4e47]">
      <div
        aria-label={deploymentStatusLabel}
        aria-live="polite"
        role="status"
        className="grid min-h-12 items-center"
      >
        <DeploymentStatusContent {...props} />
      </div>
    </section>
  )
}
