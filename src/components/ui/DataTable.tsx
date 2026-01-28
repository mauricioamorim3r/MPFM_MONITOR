import { cn } from '@/utils'

interface Column<T> {
  key: keyof T | string
  header: string
  align?: 'left' | 'center' | 'right'
  className?: string
  cellClassName?: string
  render?: (value: unknown, row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  className?: string
  onRowClick?: (row: T, index: number) => void
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, obj)
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-700">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  'py-2 px-2 text-zinc-400 font-medium',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.align === 'left' && 'text-left',
                  !col.align && 'text-left',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={cn(
                'border-b border-zinc-800/50 hover:bg-zinc-800/30',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row, rowIdx)}
            >
              {columns.map((col, colIdx) => {
                const value = getNestedValue(row, col.key as string)
                return (
                  <td
                    key={colIdx}
                    className={cn(
                      'py-2 px-2',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.align === 'left' && 'text-left',
                      !col.align && 'text-left',
                      col.cellClassName
                    )}
                  >
                    {col.render ? col.render(value, row, rowIdx) : String(value ?? '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
