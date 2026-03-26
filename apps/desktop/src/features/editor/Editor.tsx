import { NoteData } from '@/routes/notes/$id'
import { invoke } from '@tauri-apps/api/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { AutoSaveExtension } from './auto-save/AutoSaveExtension'
import { Find } from './find/Find'
import { FindExtension } from './find/FindExtension'
import { useEditorContext } from './hooks/use-editor-context'
import { SaveStatus } from './SaveStatus'

export function Editor({ note }: { note: NoteData }) {
  const { updateNote, setSaveStatus, setActiveNoteContent } = useEditorContext()
  const noteIdRef = useRef(note.id)

  const editor = useEditor({
    extensions: [
      StarterKit,
      FindExtension,
      AutoSaveExtension.configure({
        onLocalUpdate: (title: string, updatedAt: string) =>
          updateNote(noteIdRef.current, title, updatedAt),
        onSave: async (content: string, title: string) => {
          await invoke('document_update', { id: noteIdRef.current, content, title })
          setActiveNoteContent(content)
        },
        onStatusChange: setSaveStatus,
      }),
    ],
    content: note.content || '<h1></h1>',

    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: 'prose prose-sm sm:prose-base focus:outline-none max-w-full min-h-full w-full p-4',
      },
    },
  })

  useEffect(() => {
    noteIdRef.current = note.id
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content || '<h1></h1>', { emitUpdate: false })
      editor.commands.focus()
    }
    setActiveNoteContent(note.content || '')
  }, [note.id])

  return (
    <>
      <SaveStatus />
      <Find editor={editor} />
      <EditorContent className="min-w-0 flex-1" editor={editor} />
    </>
  )
}
