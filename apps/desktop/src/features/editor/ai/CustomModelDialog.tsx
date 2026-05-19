import { Button } from '@openlocus/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openlocus/ui/components/dialog'
import { Input } from '@openlocus/ui/components/input'
import { Label } from '@openlocus/ui/components/label'
import { useEffect, useState } from 'react'
import { pickGgufFile, type ModelRow } from './lib/model'
import { useAiStore } from './stores/ai-store'

type Mode = 'gguf' | 'ollama'

const OLLAMA_TAG_REGEX = /^[a-z0-9._\-]+(:[a-z0-9._\-]+)?$/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded?: (model: ModelRow) => void
}

export function CustomModelDialog({ open, onOpenChange, onAdded }: Props) {
  const addCustomModel = useAiStore((s) => s.addCustomModel)

  const [mode, setMode] = useState<Mode>('gguf')
  const [name, setName] = useState('')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [ollamaTag, setOllamaTag] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setMode('gguf')
      setName('')
      setFilePath(null)
      setOllamaTag('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const handlePickFile = async () => {
    setError(null)
    try {
      const picked = await pickGgufFile()
      if (picked) setFilePath(picked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file picker.')
    }
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      setError('Give your model a display name.')
      return
    }
    if (trimmedName.length > 64) {
      setError('Name must be 64 characters or fewer.')
      return
    }

    if (mode === 'gguf') {
      if (!filePath) {
        setError('Choose a .gguf file to continue.')
        return
      }
      if (!filePath.toLowerCase().endsWith('.gguf')) {
        setError('File must have a .gguf extension.')
        return
      }
    } else {
      const trimmedTag = ollamaTag.trim()
      if (trimmedTag.length === 0) {
        setError('Enter an Ollama model tag (e.g. mistral:7b).')
        return
      }
      if (!OLLAMA_TAG_REGEX.test(trimmedTag)) {
        setError('Tag format looks invalid. Expected something like mistral:7b.')
        return
      }
    }

    setError(null)
    setSubmitting(true)
    try {
      const row = await addCustomModel({
        name: trimmedName,
        source:
          mode === 'gguf'
            ? { source_type: 'gguf', file_path: filePath ?? '' }
            : { source_type: 'ollama', tag: ollamaTag.trim() },
      })
      onAdded?.(row)
      onOpenChange(false)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not add the custom model.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom model</DialogTitle>
          <DialogDescription>
            Bring your own model — a local <code>.gguf</code> file or any tag from the Ollama library.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'gguf' ? 'default' : 'outline'}
              onClick={() => setMode('gguf')}
            >
              Local .gguf file
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'ollama' ? 'default' : 'outline'}
              onClick={() => setMode('ollama')}
            >
              Ollama tag
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-model-name">Display name</Label>
            <Input
              id="custom-model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My TinyLlama"
              maxLength={64}
            />
          </div>

          {mode === 'gguf' ? (
            <div className="flex flex-col gap-2">
              <Label>GGUF file</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={filePath ?? ''}
                  placeholder="No file chosen"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={handlePickFile}>
                  Choose file…
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                The file is imported into Ollama with a Modelfile and stays on your machine.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="custom-model-tag">Ollama tag</Label>
              <Input
                id="custom-model-tag"
                value={ollamaTag}
                onChange={(e) => setOllamaTag(e.target.value)}
                placeholder="e.g. mistral:7b-instruct-q4_K_M"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-muted-foreground text-xs">
                Anything from <code>ollama.com/library</code> — e.g. <code>qwen2.5:0.5b</code>.
                Download starts immediately after adding. If the tag doesn't exist the download will
                fail and you can remove the model and try again.
              </p>
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
