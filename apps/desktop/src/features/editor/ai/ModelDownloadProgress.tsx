import { X } from 'lucide-react'
import { useAiStore } from './stores/ai-store'

export function ModelDownloadProgress() {
  const downloadProgressByModel = useAiStore((s) => s.downloadProgressByModel)
  const models = useAiStore((s) => s.models)
  const cancelDownload = useAiStore((s) => s.cancelDownload)

  const activeEntries = Object.entries(downloadProgressByModel).filter(
    ([, p]) => p.total === 0 || p.loaded < p.total,
  )

  if (activeEntries.length === 0) return null

  return (
    <div className="border-b">
      {activeEntries.map(([modelId, progress]) => {
        const model = models.find((m) => m.id === modelId)
        const name = model?.name ?? modelId
        const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : null

        return (
          <div key={modelId} className="px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-muted-foreground text-[11px]">
                Downloading {name}
                {percent !== null ? ` (${percent}%)` : ''}
              </p>
              <button
                className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
                onClick={() => void cancelDownload(modelId)}
                aria-label={`Cancel download of ${name}`}
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: percent !== null ? `${percent}%` : '0%' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
