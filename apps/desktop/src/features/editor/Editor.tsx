import { NoteData } from '@/routes/notes/$id'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Find } from './find/Find'

export function Editor({ note }: { note: NoteData }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false })
    }
  }, [note.id])

  return (
    <div className="relative flex flex-1 flex-col">
      <Find editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
