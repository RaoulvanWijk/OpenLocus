import { useEditorState, type Editor } from '@tiptap/react'
import { useEffect } from 'react'
import { findPluginKey } from './find-plugin'
import { FindBar } from './FindBar'

export function Find({ editor }: { editor: Editor }) {
  const open = useEditorState({
    editor,
    selector: (ctx) => findPluginKey.getState(ctx.editor.state)?.open ?? false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        editor.commands.openFind()
      }
      if (e.key === 'Escape' && open) {
        editor.commands.closeFind()
        editor.commands.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, open])

  if (!open) return null

  return (
    <FindBar
      editor={editor}
      onClose={() => {
        editor.commands.closeFind()
        editor.commands.focus()
      }}
    />
  )
}
