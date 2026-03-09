import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function useAppEditor() {
  return useEditor({
    extensions: [StarterKit],
    content: '<h1/>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-full p-4',
      },
    },
  })
}
