import { Send } from 'lucide-react'
import { useState } from 'react'

interface AITextBoxProps {
  onSend?: (message: string) => void
  isLoading?: boolean
}

export function AITextBox({ onSend, isLoading = false }: AITextBoxProps) {
  const [input, setInput] = useState('')
  const maxChars = 4000

  const handleSend = () => {
    if (input.trim() && input.length <= maxChars) {
      onSend?.(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t bg-gray-50 p-3">
      <div className="relative flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(e) => {
            if (e.target.value.length <= maxChars) {
              setInput(e.target.value)
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Stel een vraag over deze notitie…"
          className="min-h-20 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {input.length}/{maxChars}
          </span>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
