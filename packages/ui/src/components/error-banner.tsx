import { AlertCircle } from 'lucide-react'

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="bg-destructive/10 border-destructive/20 text-destructive flex gap-2 border-t px-3 py-2 text-xs">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
