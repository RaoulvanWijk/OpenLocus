import { useEditorContext } from '@/features/editor/hooks/use-editor-context'
import { Button } from '@openlocus/ui/components/button'
import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarHeader,
} from '@openlocus/ui/components/resizable-sidebar'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { AlertCircle, BotIcon, SendIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ModelStatus = {
  downloaded: boolean
  loaded: boolean
}

const INPUT_MIN_LENGTH = 1
const INPUT_MAX_LENGTH = 4000

export const AISidebar = () => {
  const { activeNoteContent } = useEditorContext()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ downloaded: false, loaded: false })
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{
    loaded: number
    total: number
  } | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    invoke<ModelStatus>('get_model_status').then(setModelStatus)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleDownload() {
    setSetupLoading(true)
    setSetupError(null)
    setDownloadProgress(null)

    const unlisten = await listen<{ loaded: number; total: number }>(
      'model_download_progress',
      (e) => {
        setDownloadProgress(e.payload)
      },
    )

    try {
      await invoke('download_model')
      setModelStatus((s) => ({ ...s, downloaded: true }))
    } catch (e) {
      setSetupError(String(e))
    } finally {
      unlisten()
      setSetupLoading(false)
      setDownloadProgress(null)
    }
  }

  async function handleLoad() {
    setSetupLoading(true)
    setSetupError(null)
    try {
      await invoke('load_model')
      setModelStatus((s) => ({ ...s, loaded: true }))
    } catch (e) {
      setSetupError(String(e))
    } finally {
      setSetupLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    // Validate input length
    if (text.length < INPUT_MIN_LENGTH || text.length > INPUT_MAX_LENGTH) {
      setChatError(
        `Message must be between ${INPUT_MIN_LENGTH} and ${INPUT_MAX_LENGTH} characters.`,
      )
      return
    }

    const userMessage: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setChatError(null)
    setIsStreaming(true)

    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages([...nextMessages, assistantPlaceholder])

    const unlistenToken = await listen<{ token: string }>('chat_token', (e) => {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: last.content + e.payload.token }
        }
        return updated
      })
    })

    const unlistenError = await listen<{ message: string }>('chat_error', (e) => {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: `Error: ${e.payload.message}` }
        }
        return updated
      })
      // Preserve input on error
      setInput(userMessage.content)
      setChatError(e.payload.message)
      setIsStreaming(false)
      cleanup()
    })

    const unlistenDone = await listen('chat_done', () => {
      setIsStreaming(false)
      cleanup()
    })

    function cleanup() {
      unlistenToken()
      unlistenError()
      unlistenDone()
    }

    try {
      await invoke('chat', {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        noteContent: activeNoteContent,
      })
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: `Error: ${String(e)}` }
        }
        return updated
      })
      // Preserve input on error
      setInput(userMessage.content)
      setChatError(String(e))
      setIsStreaming(false)
      cleanup()
    }
  }

  const progressPercent =
    downloadProgress && downloadProgress.total > 0
      ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
      : null

  return (
    <ResizableSidebar minSize="14rem" defaultSize="20rem" maxSize="32rem">
      <ResizableSidebarHeader className="flex items-center gap-2 border-b px-3 py-2">
        <BotIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">AI Assistant</span>
      </ResizableSidebarHeader>

      <ResizableSidebarContent className="flex h-full flex-col overflow-hidden">
        {!modelStatus.downloaded || !modelStatus.loaded ? (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-muted-foreground text-xs">
              A local AI model is required. It runs entirely on your device.
            </p>

            {setupError && <p className="text-destructive text-xs">{setupError}</p>}

            {!modelStatus.downloaded && (
              <Button size="sm" onClick={handleDownload} disabled={setupLoading}>
                {setupLoading
                  ? progressPercent !== null
                    ? `Downloading… ${progressPercent}%`
                    : 'Downloading…'
                  : 'Download model (~2 GB)'}
              </Button>
            )}

            {modelStatus.downloaded && !modelStatus.loaded && (
              <Button size="sm" onClick={handleLoad} disabled={setupLoading}>
                {setupLoading ? 'Loading…' : 'Load model'}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
              {messages.length === 0 && (
                <p className="text-muted-foreground mt-4 text-center text-xs">
                  Ask anything about your note.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 text-xs'
                        : 'bg-muted max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap'
                    }
                  >
                    {msg.content}
                    {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                      <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {chatError && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive flex gap-2 border-t px-3 py-2 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{chatError}</p>
              </div>
            )}

            <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2">
              <textarea
                className="bg-background placeholder:text-muted-foreground focus:ring-ring max-h-24 min-h-10 flex-1 resize-none rounded-md border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                placeholder="Ask about your note…"
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  // Clear error when user starts typing again
                  if (chatError) setChatError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={isStreaming}
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs ${input.length > INPUT_MAX_LENGTH ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                >
                  {input.length} / {INPUT_MAX_LENGTH}
                </span>
                <Button
                  size="icon-sm"
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim() || input.length > INPUT_MAX_LENGTH}
                  className="shrink-0"
                >
                  <SendIcon />
                </Button>
              </div>
            </div>
          </>
        )}
      </ResizableSidebarContent>
    </ResizableSidebar>
  )
}
