import { forwardRef } from 'react'
import { cn } from '@/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  unit?: string
  error?: string
  inputSize?: 'sm' | 'default'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      unit,
      error,
      inputSize = 'default',
      disabled,
      readOnly,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('space-y-1', className)}>
        {label && (
          <label className="text-xs text-zinc-400">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'w-full bg-zinc-800 border rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500',
              error ? 'border-red-500' : 'border-zinc-700',
              (disabled || readOnly) && 'opacity-60 cursor-not-allowed',
              inputSize === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
              unit && 'pr-12'
            )}
            {...props}
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
              {unit}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
