import type { ReactNode } from 'react'
import { DeploymentActions } from '@/deployment/components/spin-down-control'
import { StatusBadge } from '@/deployment/components/status-badge'
import { useStreamDeploymentEvents } from '@/deployment/hooks/use-stream-deployment-events'
import type { DeploymentTarget } from '@/deployment/schema'

type DeploymentStatusProps = Readonly<{
  loading?: boolean
  target: DeploymentTarget | undefined
}>

const deploymentStatusLabel = 'Deployment status'

export function DeploymentStatusSkeleton() {
  return <DeploymentStatus loading target={undefined} />
}

export function DeploymentStatus({ loading = false, target }: DeploymentStatusProps) {
  const deployment = useStreamDeploymentEvents(target)
  const failure = deployment.error && !deployment.isFetching ? deployment.error : null
  const transitioning = deployment.transition !== undefined
  const showSkeleton =
    loading ||
    (target !== undefined && failure === null && deployment.data === undefined && !transitioning)
  const event = deployment.data
  const hasDeployment = event?.type === 'snapshot' || event?.type === 'status'
  const current = hasDeployment ? event.data : null
  const refreshAnnouncement = deployment.transition === 'refresh' ? 'Refreshing status.' : null
  let action: ReactNode = (
    <DeploymentActions
      busy={transitioning}
      deploymentId={failure === null && current?.status === 'SUCCESS' ? current.id : undefined}
      onDeploymentCreated={deployment.watchDeployment}
      onRefresh={deployment.refresh}
      refreshLabel={failure ? 'Reconnect' : 'Refresh'}
      target={target}
    />
  )
  let status: ReactNode = <StatusBadge status={current?.status ?? null} />
  if (target === undefined) status = 'Choose a service'
  if (event?.type === 'gone') {
    status = <span className="text-sm text-danger-foreground">Deployment unavailable</span>
  }
  if (deployment.transition === 'reconnect') status = 'Reconnecting…'
  if (deployment.transition === 'spin-up') status = 'Starting deployment…'
  if (failure) {
    status = (
      <span className="w-full overflow-auto border-l-2 border-destructive bg-danger-surface px-3 text-sm leading-6 text-danger-foreground">
        {failure.message}
      </span>
    )
  }
  if (showSkeleton) {
    action = <span className="h-8 w-28 bg-muted" />
    status = (
      <>
        <span className="sr-only">Loading…</span>
        <span aria-hidden="true" className="h-5 w-28 bg-muted" />
      </>
    )
  }

  return (
    <section aria-label={deploymentStatusLabel} className="h-[97px] border-t border-border-subtle">
      <div className="grid h-full grid-rows-[2rem_2rem] gap-2 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2">
          <p className="truncate font-mono text-xs uppercase tracking-[0.16em] text-foreground-soft">
            {deploymentStatusLabel}
          </p>
          {action}
        </div>
        <div
          className="flex min-w-0 items-center overflow-auto"
          role={failure && !showSkeleton ? 'alert' : 'status'}
        >
          {status}
          <span className="sr-only">{refreshAnnouncement}</span>
        </div>
      </div>
    </section>
  )
}
