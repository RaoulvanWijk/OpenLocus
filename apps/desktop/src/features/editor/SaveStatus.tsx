import { useEditorContext } from './hooks/use-editor-context'

export function SaveStatus() {
  const { saveStatus } = useEditorContext()

  return (
    <span className="sticky top-2 pr-2 text-right text-xs text-gray-400 select-none">
      {saveStatus === 'saving' && 'Saving...'}
      {saveStatus === 'saved' && 'Saved'}
      {saveStatus === 'error' && 'Error saving'}
    </span>
  )
}
