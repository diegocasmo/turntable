import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border bg-clip-padding font-label text-xs font-semibold whitespace-nowrap uppercase tracking-[0.12em] shadow-[3px_3px_0_var(--color-shadow)] transition-[background-color,border-color,color,box-shadow,transform] duration-100 outline-none select-none focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-focus focus-visible:outline-solid active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--color-shadow)] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-danger aria-invalid:outline-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'border-accent bg-accent text-accent-contrast hover:border-accent-hover hover:bg-accent-hover',
        secondary:
          'border-border bg-panel-raised text-text hover:border-text-soft hover:bg-panel-hover',
        ghost: 'border-transparent bg-transparent text-text shadow-none hover:bg-panel-hover',
        destructive:
          'border-danger bg-panel-raised text-danger-text hover:bg-danger-panel hover:text-danger-text',
        destructiveConfirm:
          'border-danger bg-danger text-danger-contrast hover:border-danger-text hover:bg-danger-text',
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
