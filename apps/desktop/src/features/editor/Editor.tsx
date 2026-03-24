import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Find } from './find/Find'
import { FindExtension } from './find/FindExtension'

export function Editor() {
  const editor = useEditor({
    extensions: [StarterKit, FindExtension],
    content: '<h1>',
    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
  })

  return (
    <div className="relative flex flex-1 flex-col">
      <Find editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
