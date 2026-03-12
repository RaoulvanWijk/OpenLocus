import type { Editor } from '@tiptap/react'
import { createContext, useContext } from 'react'

export const EditorContext = createContext<Editor | null>(null)

export function useEditorContext() {
  return useContext(EditorContext)
}
