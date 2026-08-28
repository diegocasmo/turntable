import { ArrowsClockwiseIcon } from '@phosphor-icons/react/ArrowsClockwise'
import { HourglassSimpleIcon } from '@phosphor-icons/react/HourglassSimple'
import { WarningIcon } from '@phosphor-icons/react/Warning'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

const badgeToneClasses: Record<DeploymentStatusTone, string> = {
  danger: 'border-danger bg-danger-panel text-danger-text',
  neutral: 'border-border bg-panel-raised text-text-soft',
  positive: 'border-positive bg-positive-panel text-positive-text',
  progress: 'border-warning bg-warning-panel text-warning-text',
}

type StatusBadgeProps = Readonly<{
  status: DeploymentStatus | null
}>

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = status === null ? null : readDeploymentStatusPresentation(status)
  const label = presentation?.label ?? 'No active deployment'
  const tone = presentation?.tone ?? 'neutral'

  return (
    <Badge
      aria-atomic="true"
      aria-live="polite"
      className={cn('font-label font-semibold uppercase tracking-[0.12em]', badgeToneClasses[tone])}
      role="status"
    >
      {presentation?.indicator === 'activity' ? (
        <ArrowsClockwiseIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {presentation?.indicator === 'waiting' ? (
        <HourglassSimpleIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {presentation?.indicator === 'attention' ? (
        <WarningIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {label}
    </Badge>
  )
}
