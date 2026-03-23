import { Extension } from '@tiptap/react'
import { createFindPlugin, findPluginKey } from './find-plugin'

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    find: {
      /** Set the search term and options. Pass an empty string to clear. */
      setSearchTerm: (term: string, options?: { caseSensitive?: boolean }) => ReturnType
      /** Navigate to the next match. Wraps around. */
      nextMatch: () => ReturnType
      /** Navigate to the previous match. Wraps around. */
      prevMatch: () => ReturnType
      /** Clear find state entirely. */
      clearSearch: () => ReturnType
    }
  }
}

export const FindExtension = Extension.create({
  name: 'find',

  addProseMirrorPlugins() {
    return [createFindPlugin()]
  },

  addCommands() {
    return {
      setSearchTerm:
        (term, options = {}) =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true
          const prev = findPluginKey.getState(state)
          const caseSensitive = options.caseSensitive ?? prev?.caseSensitive ?? false
          tr.setMeta(findPluginKey, { term, caseSensitive, activeIndex: 0 })
          dispatch(tr)
          return true
        },

      nextMatch:
        () =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true
          const pluginState = findPluginKey.getState(state)
          if (!pluginState || pluginState.matches.length === 0) return false
          const activeIndex = (pluginState.activeIndex + 1) % pluginState.matches.length
          tr.setMeta(findPluginKey, { term: pluginState.term, caseSensitive: pluginState.caseSensitive, activeIndex, scrollTo: true })
          dispatch(tr)
          return true
        },

      prevMatch:
        () =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true
          const pluginState = findPluginKey.getState(state)
          if (!pluginState || pluginState.matches.length === 0) return false
          const activeIndex =
            (pluginState.activeIndex - 1 + pluginState.matches.length) % pluginState.matches.length
          tr.setMeta(findPluginKey, { term: pluginState.term, caseSensitive: pluginState.caseSensitive, activeIndex, scrollTo: true })
          dispatch(tr)
          return true
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true
          tr.setMeta(findPluginKey, { term: '', caseSensitive: false, activeIndex: 0 })
          dispatch(tr)
          return true
        },
    }
  },
})
