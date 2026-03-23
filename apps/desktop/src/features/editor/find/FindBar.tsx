import { type Editor, useEditorState } from '@tiptap/react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { findPluginKey } from './find-plugin'

interface FindBarProps {
  editor: Editor
  onClose: () => void
}

export function FindBar({ editor, onClose }: FindBarProps) {
  const [term, setTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Clear on unmount
  useEffect(() => {
    return () => {
      editor.commands.clearSearch()
    }
  }, [editor])

  // Subscribe to editor state so match count re-renders when plugin state changes
  const { matchCount, activeIndex } = useEditorState({
    editor,
    selector: (ctx) => {
      const s = findPluginKey.getState(ctx.editor.state)
      return {
        matchCount: s?.matches.length ?? 0,
        activeIndex: s?.activeIndex ?? 0,
      }
    },
  })

  const handleTermChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setTerm(next)
      // Run command synchronously — plugin state updates immediately
      editor.commands.setSearchTerm(next, { caseSensitive })
    },
    [editor, caseSensitive],
  )

  const handleCaseSensitiveToggle = useCallback(() => {
    setCaseSensitive((prev) => {
      const next = !prev
      editor.commands.setSearchTerm(term, { caseSensitive: next })
      return next
    })
  }, [editor, term])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          editor.commands.prevMatch()
        } else {
          editor.commands.nextMatch()
        }
      }
    },
    [editor],
  )

  const matchLabel =
    term === '' ? null : matchCount === 0 ? 'No results' : `${activeIndex + 1} of ${matchCount}`

  return (
    <div
      role="search"
      aria-label="Find in document"
      className="border-border bg-popover absolute top-2 right-4 z-50 flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-md"
    >
      <input
        ref={inputRef}
        type="text"
        value={term}
        onChange={handleTermChange}
        onKeyDown={handleKeyDown}
        placeholder="Find…"
        aria-label="Search term"
        spellCheck={false}
        className="placeholder:text-muted-foreground h-7 w-48 bg-transparent text-sm outline-none"
      />

      {matchLabel && (
        <span
          aria-live="polite"
          className="text-muted-foreground min-w-16 text-center text-xs tabular-nums"
        >
          {matchLabel}
        </span>
      )}

      <button
        type="button"
        title="Case sensitive"
        aria-pressed={caseSensitive}
        onClick={handleCaseSensitiveToggle}
        className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold transition-colors ${
          caseSensitive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        Aa
      </button>

      <div className="bg-border mx-1 h-4 w-px" />

      <button
        type="button"
        title="Previous match (Shift+Enter)"
        disabled={matchCount === 0}
        onClick={() => editor.commands.prevMatch()}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-40"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        title="Next match (Enter)"
        disabled={matchCount === 0}
        onClick={() => editor.commands.nextMatch()}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-40"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        title="Close (Escape)"
        onClick={onClose}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-6 w-6 items-center justify-center rounded transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
