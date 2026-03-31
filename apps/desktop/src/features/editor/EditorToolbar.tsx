import { Separator } from '@openlocus/ui/components/separator'
import { Toggle } from '@openlocus/ui/components/toggle'
import { useEditorState, type Editor } from '@tiptap/react'
import { findPluginKey } from './find/find-plugin'
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  List,
  ListOrdered,
  Search,
  Strikethrough,
} from 'lucide-react'

export function EditorToolbar({ editor }: { editor: Editor }) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isStrike: ctx.editor.isActive('strike'),
      isH1: ctx.editor.isActive('heading', { level: 1 }),
      isH2: ctx.editor.isActive('heading', { level: 2 }),
      isH3: ctx.editor.isActive('heading', { level: 3 }),
      isH4: ctx.editor.isActive('heading', { level: 4 }),
      isH5: ctx.editor.isActive('heading', { level: 5 }),
      isH6: ctx.editor.isActive('heading', { level: 6 }),
      isBulletList: ctx.editor.isActive('bulletList'),
      isOrderedList: ctx.editor.isActive('orderedList'),
      isFindOpen: findPluginKey.getState(ctx.editor.state)?.open ?? false,
    }),
  })

  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b px-8 py-4">
      <Toggle
        size="sm"
        pressed={editorState.isBold}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBold().run()
        }}
      >
        <Bold className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isItalic}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleItalic().run()
        }}
      >
        <Italic className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isStrike}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleStrike().run()
        }}
      >
        <Strikethrough className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Toggle
        size="sm"
        pressed={editorState.isH1}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }}
      >
        <Heading1 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isH2}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }}
      >
        <Heading2 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isH3}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }}
      >
        <Heading3 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isH4}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 4 }).run()
        }}
      >
        <Heading4 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isH5}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 5 }).run()
        }}
      >
        <Heading5 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isH6}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleHeading({ level: 6 }).run()
        }}
      >
        <Heading6 className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Toggle
        size="sm"
        pressed={editorState.isBulletList}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBulletList().run()
        }}
      >
        <List className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editorState.isOrderedList}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleOrderedList().run()
        }}
      >
        <ListOrdered className="size-4" />
      </Toggle>

      {/* <Separator orientation="vertical" className="mx-1 h-4" />

      <Button
        size="xs"
        variant="ghost"
        disabled={!editor.can().undo()}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().undo().run()
        }}
      >
        <Undo className="size-4" />
      </Button>
      <Button
        size="xs"
        variant="ghost"
        disabled={!editor.can().redo()}
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().redo().run()
        }}
      >
        <Redo className="size-4" />
      </Button> */}

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Toggle
        size="sm"
        pressed={editorState.isFindOpen}
        onMouseDown={(e) => {
          e.preventDefault()
          if (editorState.isFindOpen) {
            editor.chain().closeFind().focus().run()
          } else {
            editor.commands.openFind()
          }
        }}
        title="Find (Ctrl+F / Cmd+F)"
      >
        <Search className="size-4" />
      </Toggle>
    </div>
  )
}
