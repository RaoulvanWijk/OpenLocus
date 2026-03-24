import { NoteData } from '@/routes/notes/$id'
import { invoke } from '@tauri-apps/api/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { AutoSaveExtension } from './auto-save/AutoSaveExtension'
import { useEditorContext } from './hooks/use-editor-context'
import { SaveStatus } from './SaveStatus'

export function Editor({ note }: { note: NoteData }) {
  const { updateNote, setSaveStatus } = useEditorContext()
  const noteIdRef = useRef(note.id)

  const editor = useEditor({
    extensions: [
      StarterKit,
      AutoSaveExtension.configure({
        onLocalUpdate: (title: string, updatedAt: string) =>
          updateNote(noteIdRef.current, title, updatedAt),
        onSave: async (content: string, title: string) => {
          await invoke('document_update', { id: noteIdRef.current, content, title })
        },
        onStatusChange: setSaveStatus,
      }),
    ],
    content: note.content || '<h1>',
    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class:
          'prose prose-sm sm:prose-base focus:outline-none max-w-full wrap-anywhere min-h-full w-full p-4',
      },
    },
  })

  useEffect(() => {
    noteIdRef.current = note.id
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content || '<h1>', { emitUpdate: false })
      editor.commands.focus()
    }
  }, [note.id])

  return (
    <>
      <SaveStatus />
      <EditorContent className="relative min-w-0 flex-1 overflow-hidden" editor={editor} />
    </>
  )
}
