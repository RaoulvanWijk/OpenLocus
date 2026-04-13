import { Button } from '@openlocus/ui/components/button'
import type { UseModelSetupResult } from './hooks/use-model-setup'

type ModelSetupProps = {
  setup: UseModelSetupResult
  modelName: string
}

export function ModelSetup({ setup, modelName }: ModelSetupProps) {
  const { modelStatus, setupLoading, setupError, downloadProgress, handleDownload, handleLoad } =
    setup

  const progressPercent =
    downloadProgress && downloadProgress.total > 0
      ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
      : null

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Open Locus AI runs fully on-device, so your note content stays local. Selected model:
        <strong> {modelName}</strong>.
      </p>

      {setupError && <p className="text-destructive text-xs">{setupError}</p>}

      {!modelStatus.downloaded && (
        <Button size="sm" onClick={handleDownload} disabled={setupLoading}>
          {setupLoading
            ? progressPercent !== null
              ? `Downloading… ${progressPercent}%`
              : 'Downloading…'
            : 'Download model'}
        </Button>
      )}

      {modelStatus.downloaded && !modelStatus.loaded && (
        <Button size="sm" onClick={handleLoad} disabled={setupLoading}>
          {setupLoading ? 'Loading…' : 'Load model'}
        </Button>
      )}
    </div>
  )
}
