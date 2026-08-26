import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border bg-clip-padding font-mono text-xs font-semibold whitespace-nowrap uppercase tracking-[0.12em] shadow-[3px_3px_0_var(--shadow-color)] transition-[background-color,border-color,color,box-shadow,transform] duration-100 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--shadow-color)] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover',
        secondary:
          'border-border bg-secondary text-secondary-foreground hover:border-foreground-soft hover:bg-surface-hover',
        ghost:
          'border-transparent bg-transparent text-foreground shadow-none hover:bg-surface-hover',
        destructive:
          'border-destructive bg-secondary text-danger-foreground hover:bg-danger-surface hover:text-danger-foreground',
        destructiveConfirm:
          'border-destructive bg-destructive text-destructive-foreground hover:border-danger-foreground hover:bg-danger-foreground',
      },
      size: {
        sm: "h-8 gap-1.5 px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        default: 'h-9 gap-2 px-3',
        lg: 'h-12 gap-2 px-5',
        'icon-xs': "size-6 gap-0 px-0 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function AsyncButton({ pending, ...props }: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button
      {...props}
      aria-busy={pending || undefined}
      disabled={props.disabled || pending}
      focusableWhenDisabled={pending}
    />
  )
}

export { AsyncButton, Button, buttonVariants }
