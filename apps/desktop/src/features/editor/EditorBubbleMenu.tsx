import { Button } from '@openlocus/ui/components/button'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu editor={editor}>
      <div className="flex gap-1 rounded-md border bg-white p-1 shadow-lg">
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
      </div>
    </BubbleMenu>
  )
}
