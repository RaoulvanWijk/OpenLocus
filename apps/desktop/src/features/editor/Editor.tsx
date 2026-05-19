import { NoteData } from '@/routes/notes/$id'
import { invoke } from '@tauri-apps/api/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { AutoSaveExtension } from './auto-save/AutoSaveExtension'
import { EditorToolbar } from './EditorToolbar'
import { Find } from './find/Find'
import { FindExtension } from './find/FindExtension'
import { useEditorContext } from './hooks/use-editor-context'

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
        class:
          'prose prose-sm sm:prose-base prose-inherit prose-headings:my-0 align-top prose-p:my-0 prose-ol:my-0 prose-ul:my-0 prose-li:my-0 prose-blockquote:my-0 prose-pre:my-0 prose-figure:my-0 prose-figcaption:my-0 prose-hr:my-0 prose-table:my-0 prose-img:my-0 prose-picture:my-0 prose-video:my-0 focus:outline-none max-w-full w-full px-8 py-10 text-foreground',
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
      <EditorToolbar editor={editor} />
      <Find editor={editor} />
      <EditorContent className="min-w-0 flex-1" editor={editor} />
    </>
  )
}
