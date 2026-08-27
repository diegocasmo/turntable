import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshAction } from '@/selection/components/refresh-action'
import {
  SelectionBreadcrumbs,
  type SelectionProgress,
} from '@/selection/components/selection-breadcrumbs'

type EntitySelectionPageProps = Readonly<{
  children: ReactNode
  feedback?: string
  feedbackKind?: 'alert' | 'status'
  onRefresh?: () => void
  refreshLabel?: string
  refreshPending?: boolean
  selectionProgress: SelectionProgress
  title: string
}>

const skeletonCardKeys = ['one', 'two', 'three', 'four', 'five', 'six']

function focusHeading(element: HTMLHeadingElement | null) {
  element?.focus({ preventScroll: true })
}

export function EntitySelectionPage({
  children,
  feedback,
  feedbackKind = 'status',
  onRefresh,
  refreshLabel,
  refreshPending = false,
  selectionProgress,
  title,
}: EntitySelectionPageProps) {
  return (
    <section aria-labelledby="selection-page-title" className="grid min-w-0 gap-6">
      <SelectionBreadcrumbs progress={selectionProgress} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Railway selection
          </p>
          <h1
            ref={focusHeading}
            id="selection-page-title"
            tabIndex={-1}
            className="mt-2 break-words text-4xl leading-none tracking-[-0.04em] outline-none sm:text-5xl"
          >
            {title}
          </h1>
        </div>
        {onRefresh && refreshLabel ? (
          <RefreshAction label={refreshLabel} pending={refreshPending} onRefresh={onRefresh} />
        ) : null}
      </div>
      <p
        aria-live="polite"
        role={feedbackKind}
        className={`min-h-6 text-sm ${feedbackKind === 'alert' ? 'text-danger-foreground' : 'text-foreground-soft'}`}
      >
        {feedback}
      </p>
      <div aria-busy={refreshPending || undefined} className="grid min-w-0 gap-6">
        {children}
      </div>
    </section>
  )
}

export function EntitySelectionFailure({
  error,
  onRetry,
}: Readonly<{ error: Error; onRetry: () => void }>) {
  return (
    <div className="flex min-h-40 flex-col items-start justify-center gap-4 border-l-2 border-destructive bg-danger-surface px-5 py-8">
      <p role="alert" className="text-sm leading-6 text-danger-foreground">
        {error.message}
      </p>
      <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

export function EntitySelectionSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6 motion-safe:animate-pulse">
      <div>
        <div className="h-4 w-32 bg-muted" />
        <div className="mt-2 h-8 w-full border border-border-subtle bg-popover" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skeletonCardKeys.map((key) => (
          <div key={key} className="h-24 border border-border-subtle bg-card" />
        ))}
      </div>
    </div>
  )
}
