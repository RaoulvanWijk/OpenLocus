import type { Editor as TiptapEditor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { EditorBubbleMenu } from './editor-bubble-menu'
import { EditorToolbar } from './editor-toolbar'

export function Editor({ editor }: { editor: TiptapEditor | null }) {
  return (
    <div className="flex flex-1 flex-col border-l min-h-0">
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
