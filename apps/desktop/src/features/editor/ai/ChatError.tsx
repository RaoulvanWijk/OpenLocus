import { ErrorBanner } from '@openlocus/ui/components/error-banner'
import { useAiStore } from './stores/ai-store'

export function ChatError() {
  const chatError = useAiStore((s) => s.chatError)

  if (!chatError) {
    return null
  }

  return <ErrorBanner message={chatError} />
}
