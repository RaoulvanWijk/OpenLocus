import { Button } from '@openlocus/ui/components/button'
import { toUserErrorMessage } from './error-contract'

type GlobalErrorViewProps = {
  error: unknown
  onRetry?: () => void
}

export function GlobalErrorView({ error, onRetry }: GlobalErrorViewProps) {
  const { title, details, debugDetails, code } = toUserErrorMessage(error)

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-6">
      <div className="border-border bg-card w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs tracking-wider uppercase">OpenLocus</p>
          <h1 className="text-foreground text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">{details}</p>
        </div>

        <p className="text-muted-foreground text-xs">Error code: {code}</p>

        {debugDetails ? (
          <pre className="bg-muted text-muted-foreground max-h-40 overflow-auto rounded-md p-3 text-xs">
            {debugDetails}
          </pre>
        ) : null}

        {onRetry ? (
          <div className="pt-2">
            <Button onClick={onRetry}>Try again</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
