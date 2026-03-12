import { cn } from '@openlocus/ui/lib/utils'
import React from 'react'

interface SidebarItemProps extends React.ComponentProps<'div'> {
  note: { id: string; title: string; time: string; selected: boolean }
}

export default function SidebarItem({ note }: SidebarItemProps) {
  return (
    <div
      data-state={note.selected ? 'selected' : 'deselected'}
      className={cn(
        'group bg-sidebar relative cursor-pointer px-4 py-3 rounded-lg transition-colors duration-200',
        'hover:bg-gray-200',
        'data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm data-[state=selected]:border',
      )}
    >
      <div className="flex items-center justify-between">
        <div className='flex-1 min-w-0'>
          <p className={`truncate text-sm`}>{note.title}</p>
          <p className="mt-1 text-xs text-gray-400">{note.time}</p>
        </div>
        <button className="hidden rounded p-1 group-hover:block hover:bg-gray-200 cursor-pointer">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="1.5" fill="#6A7282" />
            <circle cx="12" cy="8" r="1.5" fill="#6A7282" />
            <circle cx="4" cy="8" r="1.5" fill="#6A7282" />
          </svg>
        </button>
      </div>
    </div>
  )
}
