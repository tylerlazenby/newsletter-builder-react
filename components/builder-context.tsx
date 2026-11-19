'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { NewsletterEditorApi } from '../editor-state'
import { createBlock } from '../templates'
import type { BlockType, MergeTagDefinition } from '../types'
import type { IconName } from './icons'

/**
 * Describes a block in the palette.
 *
 * @internal
 */
export interface BlockDefinition {
  type: BlockType
  label: string
  description: string
  icon: IconName
}

/**
 * Palette entries in display order.
 *
 * @internal
 */
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: 'header', label: 'Header', description: 'A heading (H1-H3)', icon: 'header' },
  { type: 'text', label: 'Rich text', description: 'Paragraph with bold, italic and links', icon: 'text' },
  { type: 'image', label: 'Image', description: 'Upload or link, with alt text', icon: 'image' },
  { type: 'button', label: 'Button', description: 'Call-to-action link', icon: 'button' },
  { type: 'columns', label: 'Columns', description: '2-4 columns that stack on mobile', icon: 'columns' },
  { type: 'divider', label: 'Divider', description: 'A horizontal line', icon: 'divider' },
  { type: 'spacer', label: 'Spacer', description: 'Vertical breathing room', icon: 'spacer' },
  { type: 'footer', label: 'Footer', description: 'Unsubscribe and compliance', icon: 'footer' },
]

/**
 * Looks up the human label for a block type.
 *
 * @param type - Block type.
 * @returns The palette label.
 * @internal
 */
export function blockLabel(type: BlockType): string {
  return BLOCK_DEFINITIONS.find((definition) => definition.type === type)?.label ?? type
}

/** An item being dragged. @internal */
export type DragPayload = { kind: 'new'; blockType: BlockType } | { kind: 'move'; id: string; blockType: BlockType }

/** The list position currently highlighted as a drop target. @internal */
export interface DropTarget {
  parentId: string | null
  index: number
}

/** Drag-and-drop controller shared by the palette and canvas. @internal */
export interface DragController {
  payload: DragPayload | null
  target: DropTarget | null
  setPayload: (payload: DragPayload | null) => void
  setTarget: (target: DropTarget | null) => void
  /** Applies the drop using the latest payload and target, then clears drag state. */
  commit: () => void
  /** Whether the current payload may be dropped into the list owned by `parentId`. */
  canDropInto: (parentId: string | null) => boolean
}

/** Everything the canvas, palette and inspector share. @internal */
export interface BuilderContextValue {
  editor: NewsletterEditorApi
  colorMode: 'light' | 'dark'
  /** Data used to substitute merge tags on the canvas, or `null` to show raw tags. */
  data: Record<string, string> | null
  mergeTags: MergeTagDefinition[]
  drag: DragController
  onImageUpload?: (file: File) => Promise<string>
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

/** Provider for {@link BuilderContextValue}. @internal */
export const BuilderProvider = BuilderContext.Provider

/**
 * Reads the shared builder state.
 *
 * @returns The current {@link BuilderContextValue}.
 * @throws When used outside of a `NewsletterBuilder`.
 * @internal
 */
export function useBuilder(): BuilderContextValue {
  const value = useContext(BuilderContext)
  if (!value) throw new Error('useBuilder must be used inside <NewsletterBuilder>.')
  return value
}

/**
 * Creates the drag controller used by the builder.
 *
 * @param editor - The editor API used to apply drops.
 * @returns A stable-ish {@link DragController}.
 * @internal
 */
export function useDragController(editor: NewsletterEditorApi): DragController {
  const [payload, setPayloadState] = useState<DragPayload | null>(null)
  const [target, setTargetState] = useState<DropTarget | null>(null)
  const payloadRef = useRef<DragPayload | null>(null)
  const targetRef = useRef<DropTarget | null>(null)

  const setPayload = useCallback((next: DragPayload | null) => {
    payloadRef.current = next
    setPayloadState(next)
    if (!next) {
      targetRef.current = null
      setTargetState(null)
    }
  }, [])

  const setTarget = useCallback((next: DropTarget | null) => {
    const previous = targetRef.current
    if (previous === next) return
    if (previous && next && previous.parentId === next.parentId && previous.index === next.index) return
    targetRef.current = next
    setTargetState(next)
  }, [])

  const canDropInto = useCallback(
    (parentId: string | null) => {
      const current = payloadRef.current
      if (!current) return false
      return current.blockType !== 'columns' || parentId === null
    },
    [],
  )

  const commit = () => {
    const currentPayload = payloadRef.current
    const currentTarget = targetRef.current
    if (currentPayload && currentTarget) {
      if (currentPayload.kind === 'new') editor.addBlock(createBlock(currentPayload.blockType), currentTarget)
      else editor.moveBlock(currentPayload.id, currentTarget)
    }
    setPayload(null)
  }

  return useMemo(
    () => ({ payload, target, setPayload, setTarget, commit, canDropInto }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payload, target, editor],
  )
}
