import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SpinDownControl } from '@/deployment/components/spin-down-control'
import { StatusBadge } from '@/deployment/components/status-badge'
import { useStreamDeploymentEvents } from '@/deployment/hooks/use-stream-deployment-events'
import type { DeploymentTarget } from '@/deployment/schema'

type DeploymentStatusProps = Readonly<{
  target: DeploymentTarget | undefined
}>

const deploymentStatusLabel = 'Deployment status'

function DeploymentStatusContent({ target }: DeploymentStatusProps) {
  const deployment = useStreamDeploymentEvents(target)
  const failure = deployment.error
    ? {
        label: 'Reconnect',
        message: deployment.error.message,
        retry: () => void deployment.refetch(),
      }
    : undefined

  if (failure) {
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-l-2 border-destructive bg-danger-surface px-3">
        <p role="alert" className="text-sm leading-6 text-danger-foreground">
          {failure.message}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={failure.retry}>
          {failure.label}
        </Button>
      </div>
    )
  }

  let action: ReactNode
  let status: ReactNode
  if (target === undefined) {
    status = <span className="text-sm text-foreground-soft">Choose a service</span>
  } else if (deployment.isPending) {
    status = <span className="text-sm text-foreground-soft">Loading…</span>
  } else if (deployment.data?.type === 'gone') {
    status = <span className="text-sm text-danger-foreground">Deployment unavailable</span>
  } else if (deployment.data?.type === 'snapshot' || deployment.data?.type === 'status') {
    const current = deployment.data.data
    status = <StatusBadge status={current?.status ?? null} />
    action =
      current?.status === 'SUCCESS' ? (
        <SpinDownControl key={current.id} deploymentId={current.id} />
      ) : null
  } else {
    status = null
  }

  return (
    <div className="grid gap-2">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-foreground-soft">
        {deploymentStatusLabel}
      </p>
      <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div aria-label={deploymentStatusLabel} aria-live="polite" role="status">
          {status}
        </div>
        {action}
      </div>
    </div>
  )
}

export function DeploymentStatus(props: DeploymentStatusProps) {
  return (
    <section aria-label={deploymentStatusLabel} className="border-t border-border-subtle">
      <div className="grid py-3">
        <DeploymentStatusContent {...props} />
      </div>
    </section>
  )
}
