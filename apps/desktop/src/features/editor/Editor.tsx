import { invoke } from '@tauri-apps/api/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AutoSaveExtension } from './auto-save/AutoSaveExtension'
import { useEditorContext } from './hooks/use-editor-context'
import { SaveStatus } from './SaveStatus'

type EditorProps = {
  noteId: string
  initialContent: string
}

export function Editor({ noteId, initialContent }: EditorProps) {
  const { updateNote, setSaveStatus } = useEditorContext()

  const editor = useEditor({
    extensions: [
      StarterKit,
      AutoSaveExtension.configure({
        noteId,
        onLocalUpdate: (title: string, updatedAt: string) => updateNote(noteId, title, updatedAt),
        onSave: async (content: string, title: string) => {
          await invoke('document_update', { id: noteId, content, title })
        },
        onStatusChange: setSaveStatus,
      }),
    ],
    content: initialContent || '<h1>',
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
        spellcheck: 'true',
      },
    },
  })

  return (
    <div className="flex flex-1 flex-col">
      <SaveStatus />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
