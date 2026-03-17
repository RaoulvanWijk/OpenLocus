import { EditorContext } from '@/features/editor/EditorContext'
import { useContext } from 'react'

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within an EditorContextProvider')
  }
  return context
}
