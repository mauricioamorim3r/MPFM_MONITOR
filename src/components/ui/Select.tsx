import { forwardRef } from 'react'
import { cn } from '@/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  options: SelectOption[]
  selectSize?: 'sm' | 'default'
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      selectSize = 'default',
      error,
      disabled,
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
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500',
            disabled && 'opacity-60 cursor-not-allowed',
            error && 'border-red-500',
            selectSize === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
