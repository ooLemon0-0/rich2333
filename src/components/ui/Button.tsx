import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
}

export function Button({
  children,
  className,
  variant = 'primary',
  fullWidth = false,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(variantClassMap[variant], fullWidth && 'btn-block', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
