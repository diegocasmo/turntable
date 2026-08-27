import { Tooltip } from '@base-ui/react/tooltip'
import { useLinkProps } from '@tanstack/react-router'
import { type ReactNode, useId } from 'react'

export type SelectionBreadcrumbStep =
  | Readonly<{ kind: 'link'; label: string; link: ReactNode }>
  | Readonly<{ kind: 'current'; label: string }>
  | Readonly<{ description: string; kind: 'disabled'; label: string }>

type SelectionBreadcrumbsProps = Readonly<{
  steps: readonly SelectionBreadcrumbStep[]
}>

const breadcrumbTooltipDelayMilliseconds = 100
const itemClassName =
  'inline-flex min-h-8 items-center break-words px-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-ring'

export function SelectionHomeLink() {
  const linkProps = useLinkProps({ search: {}, to: '/projects' })

  return (
    <a {...linkProps} aria-current={false}>
      Home
    </a>
  )
}

function DisabledBreadcrumb({
  description,
  label,
}: Readonly<{ description: string; label: string }>) {
  const descriptionId = useId()

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-describedby={descriptionId}
        aria-disabled="true"
        className={`${itemClassName} cursor-help border-0 bg-transparent text-muted-foreground focus-visible:bg-secondary focus-visible:text-foreground`}
      >
        {label}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-50" sideOffset={8}>
          <Tooltip.Popup
            id={descriptionId}
            role="tooltip"
            className="max-w-56 border border-border bg-popover px-3 py-2 font-mono text-xs text-foreground shadow-[3px_3px_0_var(--shadow-color)]"
          >
            {description}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function renderStep(step: SelectionBreadcrumbStep) {
  if (step.kind === 'link') {
    return (
      <span
        className={`${itemClassName} p-0 text-foreground-soft hover:text-primary [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a]:px-1 [&_a]:outline-none [&_a]:focus-visible:bg-primary [&_a]:focus-visible:text-primary-foreground [&_a]:focus-visible:outline-[3px] [&_a]:focus-visible:outline-offset-1 [&_a]:focus-visible:outline-ring`}
      >
        {step.link}
      </span>
    )
  }

  if (step.kind === 'current') {
    return (
      <span aria-current="page" className={`${itemClassName} text-foreground`}>
        {step.label}
      </span>
    )
  }

  return <DisabledBreadcrumb description={step.description} label={step.label} />
}

export function SelectionBreadcrumbs({ steps }: SelectionBreadcrumbsProps) {
  return (
    <Tooltip.Provider delay={breadcrumbTooltipDelayMilliseconds}>
      <nav aria-label="Selection progress">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {steps.map((step, index) => (
            <li key={`${step.label}-${step.kind}`} className="flex min-w-0 items-center gap-2">
              {index === 0 ? null : (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              )}
              {renderStep(step)}
            </li>
          ))}
        </ol>
      </nav>
    </Tooltip.Provider>
  )
}
