import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

const badgeToneClasses: Record<DeploymentStatusTone, string> = {
  danger: 'border-destructive bg-destructive/15 text-destructive',
  neutral: 'border-border bg-secondary text-muted-foreground',
  positive: 'border-positive bg-positive/15 text-positive-foreground',
  progress: 'border-accent bg-accent/10 text-accent',
}

type StatusBadgeProps = Readonly<{
  status: DeploymentStatus | null
}>

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = status === null ? null : readDeploymentStatusPresentation(status)
  const label = presentation?.label ?? 'No deployment'
  const tone = presentation?.tone ?? 'neutral'

  return (
    <Badge
      className={cn('font-mono font-semibold uppercase tracking-[0.12em]', badgeToneClasses[tone])}
    >
      {label}
    </Badge>
  )
}
