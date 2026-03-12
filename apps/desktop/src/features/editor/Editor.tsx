import { EditorContent } from '@tiptap/react'
import { EditorBubbleMenu } from './EditorBubbleMenu'
import { EditorToolbar } from './EditorToolbar'
import { useAppEditor } from './hooks/use-app-editor'

export function Editor() {
  const editor = useAppEditor()

  return (
    <div className="flex flex-1 flex-col border-l">
      {editor && (
        <>
          <EditorToolbar editor={editor} />
          <EditorBubbleMenu editor={editor} />
        </>
      )}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
