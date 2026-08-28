import { Input as InputPrimitive } from '@base-ui/react/input'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-control border border-muted bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-text placeholder:text-text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/20 md:text-xs',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
