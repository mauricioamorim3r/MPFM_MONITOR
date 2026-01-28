import { cn } from '@/utils'
import { LucideIcon } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon?: LucideIcon
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 bg-zinc-800/50 rounded-lg', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5',
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
          )}
        >
          {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px]',
                activeTab === tab.id ? 'bg-white/20' : 'bg-zinc-700'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
