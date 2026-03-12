import { EditorContent, useEditor } from '@tiptap/react'

import StarterKit from '@tiptap/starter-kit'

export function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<h1/>',
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
  })

  return (
    <div className="flex flex-1 flex-col">
      {editor && (
        <>
          {/* <EditorToolbar editor={editor} />
          <EditorBubbleMenu editor={editor} /> */}
        </>
      )}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
