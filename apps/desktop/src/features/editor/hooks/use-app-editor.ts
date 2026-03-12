import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function useAppEditor(onContentChange?: (text: string) => void) {
  return useEditor({
    extensions: [StarterKit],
    content: '<h1/>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
    onCreate: ({ editor }) => {
      onContentChange?.(editor.getText({ blockSeparator: '\n' }))
    },
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getText({ blockSeparator: '\n' }))
    },
  })
}
