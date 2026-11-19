import type { BlockLocation, ColumnData, LeafBlock, NewsletterBlock } from './types'

let idCounter = 0

/**
 * Creates a unique id for a block or column.
 *
 * @param prefix - Short prefix, useful when debugging documents.
 * @returns A string that is unique within the current browser session.
 *
 * @example
 * ```ts
 * createId('blk') // 'blk_k3j9x2a_1'
 * ```
 */
export function createId(prefix = 'nb'): string {
  idCounter += 1
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${idCounter}`
}

/** Result of {@link findBlock}. */
export interface FoundBlock {
  block: NewsletterBlock
  /** `null` when the block is at the root, otherwise the containing column id. */
  parentId: string | null
  index: number
}

/**
 * Locates a block anywhere in the tree.
 *
 * @param blocks - Root blocks.
 * @param id - Block id to find.
 * @returns The block with its location, or `null` when it does not exist.
 */
export function findBlock(blocks: NewsletterBlock[], id: string): FoundBlock | null {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.id === id) return { block, parentId: null, index }
    if (block.type === 'columns') {
      for (const column of block.columns) {
        const childIndex = column.blocks.findIndex((child) => child.id === id)
        if (childIndex !== -1) return { block: column.blocks[childIndex], parentId: column.id, index: childIndex }
      }
    }
  }
  return null
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const next = list.slice()
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}

/**
 * Immutably inserts a block.
 *
 * @param blocks - Root blocks.
 * @param block - Block to insert. `columns` blocks are only allowed at the root.
 * @param location - Target column (or `null` for the root) and index.
 * @returns A new root array. The original is returned unchanged when the location is invalid.
 */
export function insertBlock(blocks: NewsletterBlock[], block: NewsletterBlock, location: BlockLocation): NewsletterBlock[] {
  if (location.parentId === null) return insertAt(blocks, block, location.index)
  if (block.type === 'columns') return blocks
  const leaf: LeafBlock = block
  return blocks.map((candidate) =>
    candidate.type === 'columns'
      ? {
          ...candidate,
          columns: candidate.columns.map((column) =>
            column.id === location.parentId ? { ...column, blocks: insertAt(column.blocks, leaf, location.index) } : column,
          ),
        }
      : candidate,
  )
}

/**
 * Immutably removes a block.
 *
 * @param blocks - Root blocks.
 * @param id - Id of the block to remove.
 * @returns The new root array.
 */
export function removeBlock(blocks: NewsletterBlock[], id: string): NewsletterBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.type === 'columns'
        ? { ...block, columns: block.columns.map((column) => ({ ...column, blocks: column.blocks.filter((child) => child.id !== id) })) }
        : block,
    )
}

/**
 * Immutably patches a block's fields.
 *
 * @param blocks - Root blocks.
 * @param id - Id of the block to update.
 * @param patch - Fields to merge. The `id` and `type` are never changed.
 * @returns The new root array.
 */
export function updateBlock(blocks: NewsletterBlock[], id: string, patch: Record<string, unknown>): NewsletterBlock[] {
  const { id: _ignoredId, type: _ignoredType, ...safePatch } = patch
  const apply = <T extends NewsletterBlock>(block: T): T => (block.id === id ? ({ ...block, ...safePatch } as T) : block)
  return blocks.map((block) => {
    if (block.type !== 'columns') return apply(block)
    const patched = apply(block)
    return {
      ...patched,
      columns: patched.columns.map((column) => ({ ...column, blocks: column.blocks.map(apply) })),
    }
  })
}

/**
 * Moves a block to a new location, compensating for the index shift that
 * happens when moving later within the same list.
 *
 * @param blocks - Root blocks.
 * @param id - Id of the block to move.
 * @param location - Desired location, expressed against the list **before** removal.
 * @returns The new root array, or the original when the move is not allowed.
 */
export function moveBlock(blocks: NewsletterBlock[], id: string, location: BlockLocation): NewsletterBlock[] {
  const found = findBlock(blocks, id)
  if (!found) return blocks
  if (found.block.type === 'columns' && location.parentId !== null) return blocks
  const adjusted =
    found.parentId === location.parentId && found.index < location.index
      ? { ...location, index: location.index - 1 }
      : location
  if (found.parentId === adjusted.parentId && found.index === adjusted.index) return blocks
  return insertBlock(removeBlock(blocks, id), found.block, adjusted)
}

function cloneColumn(column: ColumnData): ColumnData {
  return { ...column, id: createId('col'), blocks: column.blocks.map((child) => ({ ...child, id: createId('blk') })) }
}

/**
 * Deep-clones a block, assigning fresh ids to it and to any nested columns and children.
 *
 * @param block - Block to clone.
 * @returns An independent copy.
 */
export function cloneBlock<T extends NewsletterBlock>(block: T): T {
  if (block.type === 'columns') {
    return { ...block, id: createId('blk'), columns: block.columns.map(cloneColumn) } as T
  }
  return { ...block, id: createId('blk') }
}
