import { Button } from '@openlocus/ui/components/button'
import { Separator } from '@openlocus/ui/components/separator'
import type { Editor } from '@tiptap/react'
import { Search } from 'lucide-react'

export function EditorToolbar({ editor }: { editor: Editor }) {
  const handleFindClick = () => {
    // Trigger Cmd+F / Ctrl+F to open Find
    const event = new KeyboardEvent('keydown', {
      key: 'f',
      code: 'KeyF',
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event)
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      <Button
        size="xs"
        data-active={editor.isActive('bold')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBold().run()
        }}
      >
        <span className="font-bold">B</span>
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('italic')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleItalic().run()
        }}
      >
        <span className="italic">I</span>
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('strike')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleStrike().run()
        }}
      >
        <span className="line-through">S</span>
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('code')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleCode().run()
        }}
      >
        <span className="font-mono text-xs">{'<>'}</span>
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 1 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }}
      >
        H1
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 2 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }}
      >
        H2
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 3 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }}
      >
        H3
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 4 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 4 }).run()
        }}
      >
        H4
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 5 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 5 }).run()
        }}
      >
        H5
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('heading', { level: 6 })}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 6 }).run()
        }}
      >
        H6
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        size="xs"
        data-active={editor.isActive('bulletList')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBulletList().run()
        }}
      >
        • List
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('orderedList')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleOrderedList().run()
        }}
      >
        1. List
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('blockquote')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBlockquote().run()
        }}
      >
        Quote
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('codeBlock')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleCodeBlock().run()
        }}
      >
        <span className="font-mono text-xs">{'{ }'}</span>
      </Button>
      <Button
        size="xs"
        data-active={editor.isActive('taskList')}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleTaskList().run()
        }}
      >
        ☐ Task
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        size="xs"
        disabled={!editor.can().undo()}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().undo().run()
        }}
      >
        Undo
      </Button>
      <Button
        size="xs"
        disabled={!editor.can().redo()}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().redo().run()
        }}
      >
        Redo
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        size="xs"
        onClick={handleFindClick}
        title="Find (Ctrl+F / Cmd+F)"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}
