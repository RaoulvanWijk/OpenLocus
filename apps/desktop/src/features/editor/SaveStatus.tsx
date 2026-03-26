import { useEditorContext } from './hooks/use-editor-context'

export function SaveStatus() {
  const { saveStatus } = useEditorContext()

  return (
    <span className="fixed top-2 right-2 text-xs text-gray-400 select-none">
      {saveStatus === 'saving' && 'Saving...'}
      {saveStatus === 'saved' && 'Saved'}
      {saveStatus === 'error' && 'Error saving'}
    </span>
  )
}
