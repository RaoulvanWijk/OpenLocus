import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AiChatPanel } from '../../features/ai-chat/ai-chat-panel'
import { EditorContext } from '../../features/editor/editor-context'
import { Editor } from '../../features/editor/editor'
import { useAppEditor } from '../../features/editor/hooks/use-app-editor'

export const Route = createFileRoute('/_editor/edit/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const [noteContent, setNoteContent] = useState('')
  // onContentChange is called by TipTap's onCreate + onUpdate callbacks —
  // no manual event subscription needed, no stale-closure risk.
  const editor = useAppEditor(setNoteContent)

  return (
    <EditorContext value={editor}>
      <main className="flex h-full flex-1 overflow-hidden">
        <Editor editor={editor} />
        <AiChatPanel noteContent={noteContent} />
      </main>
    </EditorContext>
  )
}
