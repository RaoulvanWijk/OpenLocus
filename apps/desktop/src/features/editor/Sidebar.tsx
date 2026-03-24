import { cn } from '@openlocus/ui/lib/utils'
import React from 'react'

export function Sidebar({ children, className, ...props }: React.ComponentProps<'aside'>) {
  return (
    <aside
      className={cn(
        'relative flex h-screen w-64 flex-col gap-3 border-r bg-gray-50 p-3',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-stretch', className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarContent({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-1 flex-col gap-2 overflow-y-auto', className)} {...props}>
      {children}
    </div>
  )
}
