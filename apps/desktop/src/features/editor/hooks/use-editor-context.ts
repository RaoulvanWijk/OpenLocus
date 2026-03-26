import { EditorContext } from '@/features/editor/EditorContext'
import { useContext } from 'react'

export function useEditorContext() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorContextProvider')
  }
  return context
}
