import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export interface FindState {
  open: boolean
  term: string
  caseSensitive: boolean
  activeIndex: number
  matches: { from: number; to: number }[]
  scrollTo: boolean
}

export const findPluginKey = new PluginKey<FindState>('find')

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildMatches(
  state: EditorState,
  term: string,
  caseSensitive: boolean,
): { from: number; to: number }[] {
  if (!term) return []

  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(escapeRegExp(term), flags)
  const matches: { from: number; to: number }[] = []

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(node.text)) !== null) {
      matches.push({ from: pos + match.index, to: pos + match.index + match[0].length })
    }
  })

  return matches
}

// Persistent Highlight objects are mutated in place — replacing them in the
// registry doesn't reliably trigger a repaint in all WebView implementations.
// Instantiated lazily so module import doesn't throw in environments without
// the CSS Custom Highlights API.
let findHighlight: Highlight | null = null
let findActiveHighlight: Highlight | null = null

function getHighlights(): { find: Highlight; findActive: Highlight } {
  findHighlight ??= new Highlight()
  findActiveHighlight ??= new Highlight()
  return { find: findHighlight, findActive: findActiveHighlight }
}

let lastAppliedState: FindState | null = null

function applyHighlights(view: EditorView, pluginState: FindState): void {
  if (!('highlights' in CSS)) return

  const highlights = CSS.highlights as unknown as Map<string, Highlight>
  const { find, findActive } = getHighlights()

  if (!highlights.has('find')) highlights.set('find', find)
  if (!highlights.has('find-active')) highlights.set('find-active', findActive)

  find.clear()
  findActive.clear()

  if (!pluginState.term || pluginState.matches.length === 0) return

  for (let i = 0; i < pluginState.matches.length; i++) {
    const match = pluginState.matches[i]
    if (!match) continue
    try {
      const from = view.domAtPos(match.from)
      const to = view.domAtPos(match.to)
      const range = document.createRange()
      range.setStart(from.node, from.offset)
      range.setEnd(to.node, to.offset)
      if (i === pluginState.activeIndex) {
        findActive.add(range)
      } else {
        find.add(range)
      }
    } catch {
      // position out of DOM bounds — skip
    }
  }
}

export function createFindPlugin(): Plugin<FindState> {
  return new Plugin<FindState>({
    key: findPluginKey,

    state: {
      init(): FindState {
        return { open: false, term: '', caseSensitive: false, activeIndex: 0, matches: [], scrollTo: false }
      },

      apply(tr, prev, _oldState, newState): FindState {
        const meta = tr.getMeta(findPluginKey) as Partial<FindState> | undefined

        if (meta) {
          const open = meta.open ?? prev.open
          const term = meta.term ?? prev.term
          const caseSensitive = meta.caseSensitive ?? prev.caseSensitive
          const matches = buildMatches(newState, term, caseSensitive)
          const activeIndex = Math.min(meta.activeIndex ?? 0, Math.max(0, matches.length - 1))
          return { open, term, caseSensitive, activeIndex, matches, scrollTo: meta.scrollTo ?? false }
        }

        if (tr.docChanged) {
          const matches = buildMatches(newState, prev.term, prev.caseSensitive)
          const activeIndex = Math.min(prev.activeIndex, Math.max(0, matches.length - 1))
          return { ...prev, activeIndex, matches, scrollTo: false }
        }

        return prev
      },
    },

    view() {
      return {
        update(view) {
          const pluginState = findPluginKey.getState(view.state)
          if (!pluginState || pluginState === lastAppliedState) return
          lastAppliedState = pluginState
          applyHighlights(view, pluginState)
          if (pluginState.scrollTo) {
            const match = pluginState.matches[pluginState.activeIndex]
            if (match) {
              try {
                const { node } = view.domAtPos(match.from)
                const el = node instanceof Element ? node : node.parentElement
                el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              } catch {
                // position out of DOM bounds
              }
            }
          }
        },
        destroy() {
          if (!('highlights' in CSS)) return
          findHighlight?.clear()
          findActiveHighlight?.clear()
          const highlights = CSS.highlights as unknown as Map<string, Highlight>
          highlights.delete('find')
          highlights.delete('find-active')
        },
      }
    },
  })
}
