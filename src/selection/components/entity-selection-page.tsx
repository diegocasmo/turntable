import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  SelectionBreadcrumbs,
  type SelectionProgress,
} from '@/selection/components/selection-breadcrumbs'

type EntitySelectionPageProps = Readonly<{
  children: ReactNode
  feedback?: string
  feedbackKind?: 'alert' | 'status'
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
  selectionProgress,
  title,
}: EntitySelectionPageProps) {
  return (
    <section aria-labelledby="selection-page-title" className="grid min-w-0 gap-6">
      <SelectionBreadcrumbs progress={selectionProgress} />
      <div className="min-w-0">
        <p className="font-label text-xs font-semibold uppercase tracking-[0.2em] text-accent">
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
      <p
        aria-live="polite"
        role={feedbackKind}
        className={`min-h-6 text-sm ${feedbackKind === 'alert' ? 'text-danger-text' : 'text-text-soft'}`}
      >
        {feedback}
      </p>
      <div className="grid min-w-0 gap-6">{children}</div>
    </section>
  )
}

export function EntitySelectionFailure({
  error,
  onRetry,
}: Readonly<{ error: Error; onRetry: () => void }>) {
  return (
    <div className="flex min-h-40 flex-col items-start justify-center gap-4 rounded-panel border-l-2 border-danger bg-danger-panel px-5 py-8">
      <p role="alert" className="text-sm leading-6 text-danger-text">
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
        <div className="h-4 w-32 rounded-panel bg-muted" />
        <div className="mt-2 h-8 w-full rounded-panel border border-border-subtle bg-panel-raised" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skeletonCardKeys.map((key) => (
          <div key={key} className="h-24 rounded-panel border border-border-subtle bg-panel" />
        ))}
      </div>
    </div>
  )
}
