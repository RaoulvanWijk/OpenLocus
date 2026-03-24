import { NoteData } from '@/routes/notes/$id'
import { invoke } from '@tauri-apps/api/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { AutoSaveExtension } from './auto-save/AutoSaveExtension'
import { useEditorContext } from './hooks/use-editor-context'
import { SaveStatus } from './SaveStatus'

export function Editor({ note }: { note: NoteData }) {
  const { updateNote, setSaveStatus } = useEditorContext()

  const editor = useEditor({
    extensions: [
      StarterKit,
      AutoSaveExtension.configure({
        noteId: note.id,
        onLocalUpdate: (title: string, updatedAt: string) => updateNote(note.id, title, updatedAt),
        onSave: async (content: string, title: string) => {
          await invoke('document_update', { id: note.id, content, title })
        },
        onStatusChange: setSaveStatus,
      }),
    ],
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
    <div className="flex flex-1 flex-col">
      <SaveStatus />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
