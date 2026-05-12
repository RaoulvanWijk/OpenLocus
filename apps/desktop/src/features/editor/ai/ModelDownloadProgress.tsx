import { useAiStore } from './stores/ai-store'

export function ModelDownloadProgress() {
  const downloadProgressByModel = useAiStore((s) => s.downloadProgressByModel)
  const models = useAiStore((s) => s.models)

  const activeEntry = Object.entries(downloadProgressByModel).find(
    ([, progress]) => progress.total === 0 || progress.loaded < progress.total,
  )

  if (!activeEntry) return null

  const [modelId, progress] = activeEntry
  const model = models.find((m) => m.id === modelId)
  const name = model?.name ?? modelId
  const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : null

  return (
    <div className="border-b px-3 py-2">
      <p className="text-muted-foreground mb-1 text-[11px]">
        Downloading {name}
        {percent !== null ? ` (${percent}%)` : ''}
      </p>
      <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: percent !== null ? `${percent}%` : '0%' }}
        />
      </div>
    </div>
  )
}
