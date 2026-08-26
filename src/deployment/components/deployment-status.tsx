import type { ReactNode } from 'react'
import { DeploymentActions } from '@/deployment/components/deployment-actions'
import { StatusBadge } from '@/deployment/components/status-badge'
import { useStreamDeploymentEvents } from '@/deployment/hooks/use-stream-deployment-events'
import type { DeploymentTarget } from '@/deployment/schema'

type DeploymentStatusProps = Readonly<{ target: DeploymentTarget | undefined }>
type DeploymentPanelProps = Readonly<{
  action: ReactNode
  status: ReactNode
}>

const deploymentStatusLabel = 'Deployment status'

function DeploymentPanel({ action, status }: DeploymentPanelProps) {
  return (
    <section aria-label={deploymentStatusLabel} className="h-[97px] border-t border-[#4d4e47]">
      <div className="grid h-full grid-rows-[2rem_2rem] gap-2 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2">
          <p className="truncate font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">
            {deploymentStatusLabel}
          </p>
          {action}
        </div>
        <div
          aria-label={deploymentStatusLabel}
          aria-live="polite"
          className="flex min-w-0 items-center overflow-auto"
          role="status"
        >
          {status}
        </div>
      </div>
    </section>
  )
}

export function DeploymentStatusSkeleton() {
  return (
    <DeploymentPanel
      action={<span className="h-8 w-28 bg-[#4d4e47]" />}
      status={
        <>
          <span className="sr-only">Loading…</span>
          <span aria-hidden="true" className="h-5 w-28 bg-[#4d4e47]" />
        </>
      }
    />
  )
}

export function DeploymentStatus({ target }: DeploymentStatusProps) {
  const deployment = useStreamDeploymentEvents(target)
  const failure = deployment.error && !deployment.isFetching ? deployment.error : null
  if (target !== undefined && failure === null && deployment.data === undefined) {
    return <DeploymentStatusSkeleton />
  }
  const event = deployment.data
  const hasDeployment = event?.type === 'snapshot' || event?.type === 'status'
  const current = hasDeployment ? event.data : null
  let status: ReactNode = <StatusBadge status={current?.status ?? null} />
  if (target === undefined) status = 'Choose a service'
  if (event?.type === 'gone') {
    status = <span className="text-sm text-[#f0b8ae]">Deployment unavailable</span>
  }
  if (failure) {
    status = (
      <span
        className="w-full overflow-auto border-l-2 border-[#d97767] bg-[#2d201e] px-3 text-sm leading-6 text-[#f0b8ae]"
        role="alert"
      >
        {failure.message}
      </span>
    )
  }

  return (
    <DeploymentPanel
      action={
        <DeploymentActions
          busy={deployment.isTransitioning}
          deploymentId={failure === null && current?.status === 'SUCCESS' ? current.id : undefined}
          disabled={target === undefined || deployment.isTransitioning}
          onDeploymentCreated={deployment.watchDeployment}
          onRefresh={failure ? () => void deployment.refetch() : deployment.refresh}
          refreshLabel={failure ? 'Reconnect' : 'Refresh'}
          running={hasDeployment ? current !== null && !current.deploymentStopped : undefined}
          target={target}
        />
      }
      status={status}
    />
  )
}
