import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'
import { useEditor as useEditorContext } from './hooks/use-editor'
import { AutoSaveExtension, SaveStatus } from './auto-save/AutoSaveExtension'

type EditorProps = {
  noteId: string
  initialContent: string
}

export function Editor({ noteId, initialContent }: EditorProps) {
  const { loadNotes } = useEditorContext()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const editor = useEditor({
    extensions: [
      StarterKit,
      AutoSaveExtension.configure({
        noteId,
        onSave: async (content: string, title: string) => {
          await invoke('document_update', { id: noteId, content, title })
          await loadNotes()
        },
        onStatusChange: setSaveStatus,
      }),
    ],
    content: initialContent || '<h1></h1>',
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
  })

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-4 py-1 text-xs text-gray-400 select-none">
        {saveStatus === 'saving' && 'Saving...'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Error saving'}
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
