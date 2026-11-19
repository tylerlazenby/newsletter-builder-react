'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { cloneBlock, findBlock, insertBlock, moveBlock, removeBlock, updateBlock } from './tree'
import type { BlockLocation, NewsletterBlock, NewsletterDocument, NewsletterTheme } from './types'

const HISTORY_LIMIT = 100

/**
 * Internal editor state: the current document plus undo/redo stacks.
 */
export interface EditorState {
  present: NewsletterDocument
  past: NewsletterDocument[]
  future: NewsletterDocument[]
  selectedId: string | null
  /** Key of the last coalescable edit, used to merge rapid keystrokes into one undo step. */
  lastCoalesceKey: string | null
}

/**
 * Every action understood by {@link editorReducer}.
 */
export type EditorAction =
  | { type: 'ADD_BLOCK'; block: NewsletterBlock; location: BlockLocation }
  | { type: 'MOVE_BLOCK'; id: string; location: BlockLocation }
  | { type: 'UPDATE_BLOCK'; id: string; patch: Record<string, unknown>; coalesceKey?: string }
  | { type: 'REMOVE_BLOCK'; id: string }
  | { type: 'DUPLICATE_BLOCK'; id: string }
  | { type: 'NUDGE_BLOCK'; id: string; delta: -1 | 1 }
  | { type: 'UPDATE_META'; patch: Partial<Pick<NewsletterDocument, 'subject' | 'preheader'>>; coalesceKey?: string }
  | { type: 'UPDATE_THEME'; patch: Partial<NewsletterTheme>; coalesceKey?: string }
  | { type: 'REPLACE_DOCUMENT'; document: NewsletterDocument }
  | { type: 'SELECT'; id: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }

/**
 * Creates the initial reducer state.
 *
 * @param document - The starting document.
 * @returns A fresh {@link EditorState} with empty history.
 */
export function createEditorState(document: NewsletterDocument): EditorState {
  return { present: document, past: [], future: [], selectedId: null, lastCoalesceKey: null }
}

function commit(state: EditorState, next: NewsletterDocument, coalesceKey?: string, selectedId = state.selectedId): EditorState {
  if (next === state.present) return state
  const coalesce = coalesceKey !== undefined && coalesceKey === state.lastCoalesceKey
  return {
    present: next,
    past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
    future: [],
    selectedId,
    lastCoalesceKey: coalesceKey ?? null,
  }
}

/**
 * Pure reducer behind {@link useNewsletterEditor}. Exported so it can be unit
 * tested or reused with your own state container.
 *
 * @param state - Current state.
 * @param action - The action to apply.
 * @returns The next state. The same object is returned when nothing changed.
 *
 * @example
 * ```ts
 * const next = editorReducer(createEditorState(doc), { type: 'UNDO' })
 * ```
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const doc = state.present
  switch (action.type) {
    case 'ADD_BLOCK':
      return commit(state, { ...doc, blocks: insertBlock(doc.blocks, action.block, action.location) }, undefined, action.block.id)
    case 'MOVE_BLOCK':
      return commit(state, { ...doc, blocks: moveBlock(doc.blocks, action.id, action.location) }, undefined, action.id)
    case 'UPDATE_BLOCK':
      return commit(state, { ...doc, blocks: updateBlock(doc.blocks, action.id, action.patch) }, action.coalesceKey)
    case 'REMOVE_BLOCK':
      return commit(state, { ...doc, blocks: removeBlock(doc.blocks, action.id) }, undefined, state.selectedId === action.id ? null : state.selectedId)
    case 'DUPLICATE_BLOCK': {
      const found = findBlock(doc.blocks, action.id)
      if (!found) return state
      const copy = cloneBlock(found.block)
      return commit(
        state,
        { ...doc, blocks: insertBlock(doc.blocks, copy, { parentId: found.parentId, index: found.index + 1 }) },
        undefined,
        copy.id,
      )
    }
    case 'NUDGE_BLOCK': {
      const found = findBlock(doc.blocks, action.id)
      if (!found) return state
      const index = action.delta < 0 ? found.index - 1 : found.index + 2
      if (action.delta < 0 && found.index === 0) return state
      return commit(state, { ...doc, blocks: moveBlock(doc.blocks, action.id, { parentId: found.parentId, index }) })
    }
    case 'UPDATE_META':
      return commit(state, { ...doc, ...action.patch }, action.coalesceKey)
    case 'UPDATE_THEME':
      return commit(state, { ...doc, theme: { ...doc.theme, ...action.patch } }, action.coalesceKey)
    case 'REPLACE_DOCUMENT':
      return commit(state, action.document, undefined, null)
    case 'SELECT':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id }
    case 'UNDO': {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return { ...state, present: previous, past: state.past.slice(0, -1), future: [doc, ...state.future], lastCoalesceKey: null }
    }
    case 'REDO': {
      const [next, ...rest] = state.future
      if (!next) return state
      return { ...state, present: next, past: [...state.past, doc], future: rest, lastCoalesceKey: null }
    }
  }
}

/**
 * Imperative API returned by {@link useNewsletterEditor}.
 */
export interface NewsletterEditorApi {
  /** The current document. */
  document: NewsletterDocument
  /** Id of the selected block, or `null`. */
  selectedId: string | null
  /** The selected block, or `null`. */
  selectedBlock: NewsletterBlock | null
  canUndo: boolean
  canRedo: boolean
  /** Inserts a block at an explicit location and selects it. */
  addBlock: (block: NewsletterBlock, location: BlockLocation) => void
  /** Inserts a block after the current selection (or at the end) and selects it. */
  appendBlock: (block: NewsletterBlock) => void
  moveBlock: (id: string, location: BlockLocation) => void
  /** Shallow-merges fields onto a block. Pass `coalesceKey` while typing to merge undo steps. */
  updateBlock: (id: string, patch: Record<string, unknown>, coalesceKey?: string) => void
  removeBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  /** Moves a block one position up (`-1`) or down (`1`) within its list. */
  nudgeBlock: (id: string, delta: -1 | 1) => void
  updateMeta: (patch: Partial<Pick<NewsletterDocument, 'subject' | 'preheader'>>, coalesceKey?: string) => void
  updateTheme: (patch: Partial<NewsletterTheme>, coalesceKey?: string) => void
  /** Replaces the whole document (for example when applying a template). Undoable. */
  replaceDocument: (document: NewsletterDocument) => void
  select: (id: string | null) => void
  undo: () => void
  redo: () => void
}

/**
 * Headless editing state for a {@link NewsletterDocument}, with undo/redo,
 * selection and tree-aware block operations.
 *
 * @param initialDocument - Starting document. Only read on first render.
 * @param onChange - Called with the new document after every committed change (not on mount).
 * @returns A stable {@link NewsletterEditorApi}.
 *
 * @remarks
 * Use this hook to build your own editor chrome while reusing the same state
 * logic as {@link NewsletterBuilder}.
 *
 * @example
 * ```tsx
 * function MiniEditor() {
 *   const editor = useNewsletterEditor(createWelcomeTemplate(), (doc) => save(doc))
 *   return <button onClick={() => editor.appendBlock(createBlock('divider'))}>Add divider</button>
 * }
 * ```
 */
export function useNewsletterEditor(
  initialDocument: NewsletterDocument,
  onChange?: (document: NewsletterDocument) => void,
): NewsletterEditorApi {
  const [state, dispatch] = useReducer(editorReducer, initialDocument, createEditorState)
  const onChangeRef = useRef(onChange)
  const firstRender = useRef(true)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    onChangeRef.current?.(state.present)
  }, [state.present])

  const stateRef = useRef(state)
  stateRef.current = state

  const appendBlock = useCallback((block: NewsletterBlock) => {
    const { present, selectedId } = stateRef.current
    const selected = selectedId ? findBlock(present.blocks, selectedId) : null
    let location: BlockLocation = { parentId: null, index: present.blocks.length }
    if (selected) {
      if (selected.parentId === null) location = { parentId: null, index: selected.index + 1 }
      else if (block.type === 'columns') {
        const parentIndex = present.blocks.findIndex(
          (candidate) => candidate.type === 'columns' && candidate.columns.some((column) => column.id === selected.parentId),
        )
        location = { parentId: null, index: parentIndex + 1 }
      } else location = { parentId: selected.parentId, index: selected.index + 1 }
    }
    dispatch({ type: 'ADD_BLOCK', block, location })
  }, [])

  return useMemo<NewsletterEditorApi>(
    () => ({
      document: state.present,
      selectedId: state.selectedId,
      selectedBlock: state.selectedId ? (findBlock(state.present.blocks, state.selectedId)?.block ?? null) : null,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      addBlock: (block, location) => dispatch({ type: 'ADD_BLOCK', block, location }),
      appendBlock,
      moveBlock: (id, location) => dispatch({ type: 'MOVE_BLOCK', id, location }),
      updateBlock: (id, patch, coalesceKey) => dispatch({ type: 'UPDATE_BLOCK', id, patch, coalesceKey }),
      removeBlock: (id) => dispatch({ type: 'REMOVE_BLOCK', id }),
      duplicateBlock: (id) => dispatch({ type: 'DUPLICATE_BLOCK', id }),
      nudgeBlock: (id, delta) => dispatch({ type: 'NUDGE_BLOCK', id, delta }),
      updateMeta: (patch, coalesceKey) => dispatch({ type: 'UPDATE_META', patch, coalesceKey }),
      updateTheme: (patch, coalesceKey) => dispatch({ type: 'UPDATE_THEME', patch, coalesceKey }),
      replaceDocument: (document) => dispatch({ type: 'REPLACE_DOCUMENT', document }),
      select: (id) => dispatch({ type: 'SELECT', id }),
      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
    }),
    [state, appendBlock],
  )
}
