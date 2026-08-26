import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border bg-clip-padding font-mono text-xs font-semibold whitespace-nowrap uppercase tracking-[0.12em] shadow-[3px_3px_0_#090a08] transition-[background-color,border-color,color,box-shadow,transform] duration-100 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d59c55] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#090a08] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-[#d97767] aria-invalid:outline-[#d97767] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'border-[#d59c55] bg-[#d59c55] text-[#141613] hover:border-[#e5ad68] hover:bg-[#e5ad68]',
        secondary:
          'border-[#706d60] bg-[#242522] text-[#f4f0e6] hover:border-[#c9c5b9] hover:bg-[#30312d]',
        ghost: 'border-transparent bg-transparent text-[#f4f0e6] shadow-none hover:bg-[#30312d]',
        destructive:
          'border-[#d97767] bg-[#242522] text-[#f0b8ae] hover:bg-[#2d201e] hover:text-[#f0b8ae]',
        destructiveConfirm:
          'border-[#d97767] bg-[#d97767] text-[#141613] hover:border-[#f0b8ae] hover:bg-[#f0b8ae]',
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

export { Button, buttonVariants }
