import { type Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { FindBar } from './FindBar'

interface FindProps {
  editor: Editor
}

export function Find({ editor }: FindProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        editor.commands.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  if (!open) return null

  return (
    <FindBar
      editor={editor}
      onClose={() => {
        setOpen(false)
        editor.commands.focus()
      }}
    />
  )
}
