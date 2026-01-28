import { Check } from 'lucide-react'
import { cn } from '@/utils'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto pb-1', className)}>
      {steps.map((step, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isPending = stepNumber > currentStep

        return (
          <div key={i} className="flex items-center">
            <button
              onClick={() => onStepClick?.(stepNumber)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg transition flex-shrink-0',
                isCurrent && 'bg-blue-600 text-white',
                isCompleted && 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
                isPending && 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                  isCompleted && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-white text-blue-600',
                  isPending && 'bg-zinc-700 text-zinc-400'
                )}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : stepNumber}
              </div>
              <span className="text-xs hidden lg:inline whitespace-nowrap">
                {step}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-4 h-px flex-shrink-0 mx-1',
                  isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
