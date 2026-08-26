import { ArrowClockwiseIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useIsMutating } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SpinDownControl } from '@/deployment/components/spin-down-control'
import { SpinUpControl } from '@/deployment/components/spin-up-control'
import { StatusBadge } from '@/deployment/components/status-badge'
import { deploymentLifecycleMutationKey } from '@/deployment/hooks/deployment-lifecycle'
import { useStreamDeploymentEvents } from '@/deployment/hooks/use-stream-deployment-events'
import type { DeploymentTarget } from '@/deployment/schema'

type DeploymentStatusProps = Readonly<{
  selectionFailure: Readonly<{ message: string; retry: () => void }> | undefined
  target: DeploymentTarget | undefined
}>

const deploymentStatusLabel = 'Deployment status'

function DeploymentStatusContent({ selectionFailure, target }: DeploymentStatusProps) {
  const deployment = useStreamDeploymentEvents(target)
  const lifecycleMutationCount = useIsMutating({ mutationKey: deploymentLifecycleMutationKey })
  const failure = selectionFailure && { ...selectionFailure, label: 'Retry' }

  if (failure) {
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-l-2 border-[#d97767] bg-[#2d201e] px-3">
        <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
          {failure.message}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={failure.retry}>
          {failure.label}
        </Button>
      </div>
    )
  }

  let action: ReactNode
  let running: boolean | undefined
  let status: ReactNode
  if (target === undefined) {
    status = <span className="text-sm text-[#c9c5b9]">Choose a service</span>
  } else if (
    deployment.isPending ||
    (deployment.isTransitioning && deployment.data === undefined)
  ) {
    status = <span className="text-sm text-[#c9c5b9]">Loading…</span>
  } else if (deployment.error) {
    status = (
      <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
        {deployment.error.message}
      </p>
    )
  } else if (deployment.data?.type === 'gone') {
    status = <span className="text-sm text-[#f0b8ae]">Deployment unavailable</span>
  } else if (deployment.data?.type === 'snapshot' || deployment.data?.type === 'status') {
    const current = deployment.data.data
    status = <StatusBadge status={current?.status ?? null} />
    running = current === null ? false : !current.deploymentStopped
  } else {
    status = null
  }

  if (target !== undefined) {
    const actionsDisabled = lifecycleMutationCount > 0 || deployment.isTransitioning
    const current =
      deployment.error === null &&
      (deployment.data?.type === 'snapshot' || deployment.data?.type === 'status')
        ? deployment.data.data
        : null
    const refreshLabel = deployment.error ? 'Reconnect' : 'Refresh'
    const refreshPending = deployment.transition === 'refresh'
    action = (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          aria-busy={refreshPending || undefined}
          aria-label={refreshPending ? 'Refreshing…' : undefined}
          disabled={actionsDisabled}
          onClick={deployment.refresh}
        >
          {refreshPending ? (
            <CircleNotchIcon aria-hidden="true" className="animate-spin" weight="bold" />
          ) : (
            <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
          )}
          {refreshLabel}
        </Button>
        <SpinUpControl
          disabled={actionsDisabled}
          onDeploymentCreated={deployment.watchDeployment}
          pending={deployment.transition === 'spin-up'}
          running={running}
          target={target}
        />
        {current?.status === 'SUCCESS' ? (
          <SpinDownControl key={current.id} deploymentId={current.id} disabled={actionsDisabled} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9c5b9]">
        {deploymentStatusLabel}
      </p>
      <div className="grid min-h-9 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
    <section aria-label={deploymentStatusLabel} className="border-t border-[#4d4e47]">
      <div className="grid py-3">
        <DeploymentStatusContent {...props} />
      </div>
    </section>
  )
}
