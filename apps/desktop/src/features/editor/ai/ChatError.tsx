import { AlertCircle } from 'lucide-react'

type ChatErrorProps = {
  error: string | null
}

export function ChatError({ error }: ChatErrorProps) {
  if (!error) {
    return null
  }

  return (
    <div className="bg-destructive/10 border-destructive/20 text-destructive flex gap-2 border-t px-3 py-2 text-xs">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{error}</p>
    </div>
  )
}
