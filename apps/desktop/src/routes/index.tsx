import { Button } from '@openlocus/ui/components/button'
import { Input } from '@openlocus/ui/components/input'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ModelStatus = {
  downloaded: boolean
  loaded: boolean
}

function RouteComponent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{
    loaded: number
    total: number
  } | null>(null)
  const [loadingModel, setLoadingModel] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshStatus = () => invoke<ModelStatus>('get_model_status').then(setModelStatus)

  // Check model status on mount
  useEffect(() => {
    refreshStatus()
  }, [])

  // Auto load model if downloaded but not loaded
  useEffect(() => {
    if (modelStatus?.downloaded && !modelStatus.loaded) {
      setLoadingModel(true)
      invoke('load_model')
        .then(refreshStatus)
        .catch(console.error)
        .finally(() => setLoadingModel(false))
    }
  }, [modelStatus?.downloaded])

  // Download progress events
  useEffect(() => {
    const unlisten = listen<{ loaded: number; total: number }>('model_download_progress', (e) =>
      setDownloadProgress(e.payload),
    )
    return () => {
      unlisten.then((f) => f())
    }
  }, [])

  // Streaming chat token events
  useEffect(() => {
    const unlistenToken = listen<{ token: string }>('chat_token', (e) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            { role: 'assistant', content: last.content + e.payload.token },
          ]
        }
        return [...prev, { role: 'assistant', content: e.payload.token }]
      })
    })

    const unlistenDone = listen('chat_done', () => {
      setSending(false)
    })

    const unlistenError = listen<{ message: string }>('chat_error', (e) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${e.payload.message}` }])
      setSending(false)
    })

    return () => {
      unlistenToken.then((f) => f())
      unlistenDone.then((f) => f())
      unlistenError.then((f) => f())
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleDownload = async () => {
    setDownloadProgress({ loaded: 0, total: 0 })
    try {
      await invoke('download_model')
      await refreshStatus()
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadProgress(null)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    try {
      await invoke('chat', {
        messages: updatedMessages,
        noteContent: '', // wire up to real notes later
      })
      // response streams in via chat_token events, chat_done sets sending=false
    } catch (e) {
      setMessages([...updatedMessages, { role: 'assistant', content: `❌ ${e}` }])
      setSending(false)
    }
  }

  // Null = still checking
  if (modelStatus === null) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </main>
    )
  }

  // Not downloaded yet
  if (!modelStatus.downloaded) {
    const percent =
      downloadProgress && downloadProgress.total > 0
        ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
        : 0

    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Open Locus</h1>
        <p className="text-muted-foreground text-sm">
          The AI model needs to be downloaded before you can use the chat (~2GB).
        </p>
        {downloadProgress !== null ? (
          <div className="w-full max-w-sm">
            <div className="bg-muted h-2 w-full rounded-full">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-center text-sm">
              {percent}% — {(downloadProgress.loaded / 1024 / 1024).toFixed(0)} MB
            </p>
          </div>
        ) : (
          <Button onClick={handleDownload}>Download Model</Button>
        )}
      </main>
    )
  }

  // Downloaded but model still loading into memory
  if (!modelStatus.loaded || loadingModel) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading model into memory...</p>
      </main>
    )
  }

  // Chat screen
  return (
    <main className="flex h-screen flex-col p-4">
      <div className="mb-4 flex justify-between">
        <h1 className="text-2xl font-bold">Open Locus</h1>
        <Link to="/notes">Edit notes</Link>
      </div>

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-muted-foreground mt-8 text-center text-sm">
            Ask anything about your notes...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your notes..."
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>
          Send
        </Button>
      </div>
    </main>
  )
}
