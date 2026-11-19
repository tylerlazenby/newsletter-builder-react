'use client'

import { Fragment } from 'react'
import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from 'react'
import { getFontStack } from '../constants'
import { applyMergeTags, createMergeTagPattern } from '../merge-tags'
import { sanitizeRichText, sanitizeUrl } from '../sanitize'
import { createBlock, createProductUpdateTemplate, createWelcomeTemplate } from '../templates'
import type { NewsletterBlock } from '../types'
import { BLOCK_DEFINITIONS, blockLabel, useBuilder } from './builder-context'
import { Icon } from './icons'
import { Tooltip } from './Tooltip'

/**
 * Renders text with merge tags either substituted from `data` or highlighted as chips.
 *
 * @param text - Plain text that may contain `{{tags}}`.
 * @param data - Sample data, or `null` to highlight tags.
 * @returns React nodes safe to render inside any element.
 * @internal
 */
export function renderTagNodes(text: string, data: Record<string, string> | null): ReactNode {
  if (data) return applyMergeTags(text, data)
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0
  for (const match of text.matchAll(createMergeTagPattern())) {
    const start = match.index ?? 0
    nodes.push(text.slice(cursor, start))
    nodes.push(
      <span key={key++} className="nb-tag">
        {match[0]}
      </span>,
    )
    cursor = start + match[0].length
  }
  nodes.push(text.slice(cursor))
  return nodes
}

function richHtmlForCanvas(html: string, data: Record<string, string> | null): string {
  const clean = sanitizeRichText(html)
  if (data) return applyMergeTags(clean, data, { escapeValues: true })
  return clean
    .split(/(<[^>]+>)/)
    .map((segment) =>
      segment.startsWith('<') ? segment : segment.replace(createMergeTagPattern(), (tag) => `<span class="nb-tag">${tag}</span>`),
    )
    .join('')
}

function BlockView({ block }: { block: NewsletterBlock }) {
  const { data } = useBuilder()
  switch (block.type) {
    case 'header': {
      const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3'
      return (
        <Heading className="nb-cv-heading" style={{ textAlign: block.align, color: block.color }}>
          {renderTagNodes(block.text, data)}
        </Heading>
      )
    }
    case 'text':
      return (
        <div
          className="nb-cv-text"
          style={{ textAlign: block.align, fontSize: block.fontSize }}
          dangerouslySetInnerHTML={{ __html: richHtmlForCanvas(block.html, data) }}
        />
      )
    case 'image': {
      const src = sanitizeUrl(block.src, { allowDataImage: true })
      return (
        <div className="nb-cv-image" style={{ textAlign: block.align }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={block.alt} style={{ width: `${block.widthPercent}%` }} />
          ) : (
            <div className="nb-cv-image-empty">Add an image URL or upload a file</div>
          )}
        </div>
      )
    }
    case 'button':
      return (
        <div className="nb-cv-button-row" style={{ textAlign: block.align }}>
          <span
            className="nb-cv-button"
            style={{
              borderRadius: block.borderRadius,
              background: block.backgroundColor,
              color: block.textColor,
              display: block.fullWidth ? 'block' : 'inline-block',
            }}
          >
            {renderTagNodes(block.label, data)}
          </span>
        </div>
      )
    case 'divider':
      return (
        <div className="nb-cv-divider-row">
          <hr
            className="nb-cv-divider"
            style={{ borderTopWidth: block.thickness, borderTopStyle: block.style, width: `${block.widthPercent}%` }}
          />
        </div>
      )
    case 'spacer':
      return (
        <div className="nb-cv-spacer" style={{ height: block.height }}>
          <span>{block.height}px</span>
        </div>
      )
    case 'footer':
      return (
        <div className="nb-cv-footer" style={{ textAlign: block.align }}>
          <p>{renderTagNodes(block.reason, data)}</p>
          <p style={{ whiteSpace: 'pre-line' }}>
            {block.companyName}
            {block.address ? `\n${block.address}` : ''}
          </p>
          <p>
            <span className="nb-cv-link">{block.unsubscribeLabel}</span>
            {block.showPreferences ? (
              <>
                {' | '}
                <span className="nb-cv-link">{block.preferencesLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      )
    case 'columns':
      return (
        <div className="nb-cv-columns" style={{ gap: block.gap }}>
          {block.columns.map((column) => (
            <div key={column.id} className="nb-cv-column" style={{ flex: `${column.widthPercent} 1 0%` }}>
              <BlockList parentId={column.id} blocks={column.blocks} />
            </div>
          ))}
        </div>
      )
  }
}

function DropIndicator() {
  return <div className="nb-drop-indicator" aria-hidden="true" />
}

interface BlockShellProps {
  block: NewsletterBlock
  parentId: string | null
  index: number
  total: number
}

function BlockShell({ block, parentId, index, total }: BlockShellProps) {
  const { editor, drag } = useBuilder()
  const selected = editor.selectedId === block.id
  const dragging = drag.payload?.kind === 'move' && drag.payload.id === block.id
  const label = blockLabel(block.type)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      editor.select(block.id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      editor.removeBlock(block.id)
    } else if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault()
      editor.nudgeBlock(block.id, -1)
    } else if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault()
      editor.nudgeBlock(block.id, 1)
    }
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const payload = drag.payload
    if (!payload || !drag.canDropInto(parentId)) return
    event.preventDefault()
    event.stopPropagation()
    if (payload.kind === 'move' && payload.id === block.id) {
      drag.setTarget(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    drag.setTarget({ parentId, index: after ? index + 1 : index })
    event.dataTransfer.dropEffect = payload.kind === 'new' ? 'copy' : 'move'
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!drag.payload || !drag.canDropInto(parentId)) return
    event.preventDefault()
    event.stopPropagation()
    drag.commit()
  }

  return (
    <div
      className="nb-block"
      data-selected={selected}
      data-dragging={dragging}
      data-type={block.type}
      tabIndex={0}
      role="group"
      aria-label={`${label} block${selected ? ' (selected)' : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        editor.select(block.id)
      }}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="nb-block-bar">
        <Tooltip label="Drag to reorder">
          <button
            type="button"
            className="nb-icon-btn nb-grip"
            draggable
            aria-label={`Drag ${label} block`}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', block.id)
              event.dataTransfer.effectAllowed = 'move'
              const shell = event.currentTarget.closest('.nb-block')
              if (shell) event.dataTransfer.setDragImage(shell, 16, 16)
              drag.setPayload({ kind: 'move', id: block.id, blockType: block.type })
            }}
            onDragEnd={() => drag.setPayload(null)}
          >
            <Icon name="grip" />
          </button>
        </Tooltip>
        <span className="nb-block-name">{label}</span>
        <span className="nb-block-actions">
          <Tooltip label="Move up (Alt+Up)">
            <button type="button" className="nb-icon-btn" aria-label="Move block up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); editor.nudgeBlock(block.id, -1) }}>
              <Icon name="up" />
            </button>
          </Tooltip>
          <Tooltip label="Move down (Alt+Down)">
            <button type="button" className="nb-icon-btn" aria-label="Move block down" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); editor.nudgeBlock(block.id, 1) }}>
              <Icon name="down" />
            </button>
          </Tooltip>
          <Tooltip label="Duplicate">
            <button type="button" className="nb-icon-btn" aria-label="Duplicate block" onClick={(e) => { e.stopPropagation(); editor.duplicateBlock(block.id) }}>
              <Icon name="duplicate" />
            </button>
          </Tooltip>
          <Tooltip label="Delete (Del)">
            <button type="button" className="nb-icon-btn nb-danger" aria-label="Delete block" onClick={(e) => { e.stopPropagation(); editor.removeBlock(block.id) }}>
              <Icon name="trash" />
            </button>
          </Tooltip>
        </span>
      </div>
      <div className="nb-block-body">
        <BlockView block={block} />
      </div>
    </div>
  )
}

function EmptyState() {
  const { editor } = useBuilder()
  return (
    <div className="nb-empty" role="region" aria-label="Getting started">
      <div className="nb-empty-icon">
        <Icon name="wand" size={22} />
      </div>
      <h2 className="nb-empty-title">Start your newsletter</h2>
      <p className="nb-empty-copy">
        Drag a block from the left, or click one to add it. Then select it to edit its content on the right.
      </p>
      <div className="nb-empty-actions">
        <button type="button" className="nb-btn nb-btn-primary" onClick={() => editor.replaceDocument(createWelcomeTemplate())}>
          Use the welcome template
        </button>
        <button type="button" className="nb-btn" onClick={() => editor.replaceDocument(createProductUpdateTemplate())}>
          Use the product update template
        </button>
        <button type="button" className="nb-btn nb-btn-ghost" onClick={() => editor.appendBlock(createBlock('header'))}>
          Add a header
        </button>
      </div>
    </div>
  )
}

/**
 * A list of blocks with drop handling. Used for the document root and for each column cell.
 *
 * @internal
 */
function BlockList({ parentId, blocks }: { parentId: string | null; blocks: NewsletterBlock[] }) {
  const { drag } = useBuilder()
  const active = drag.payload && drag.target && drag.target.parentId === parentId ? drag.target.index : null

  return (
    <div
      className="nb-list"
      data-empty={blocks.length === 0}
      onDragOver={(event) => {
        if (!drag.payload || !drag.canDropInto(parentId)) return
        event.preventDefault()
        event.stopPropagation()
        drag.setTarget({ parentId, index: blocks.length })
      }}
      onDrop={(event) => {
        if (!drag.payload || !drag.canDropInto(parentId)) return
        event.preventDefault()
        event.stopPropagation()
        drag.commit()
      }}
    >
      {blocks.map((block, index) => (
        <Fragment key={block.id}>
          {active === index ? <DropIndicator /> : null}
          <BlockShell block={block} parentId={parentId} index={index} total={blocks.length} />
        </Fragment>
      ))}
      {active === blocks.length ? <DropIndicator /> : null}
      {blocks.length === 0 ? (
        parentId === null ? (
          <EmptyState />
        ) : (
          <div className="nb-column-empty">Drop a block here</div>
        )
      ) : null}
    </div>
  )
}

/**
 * The WYSIWYG editing surface. Reads everything from the builder context.
 *
 * @returns The scrollable canvas with the email "sheet".
 * @internal
 */
export function Canvas() {
  const { editor, colorMode, drag } = useBuilder()
  const { theme, blocks } = editor.document
  const colors = theme[colorMode]

  const style = {
    '--cv-page': colors.pageBackground,
    '--cv-content': colors.contentBackground,
    '--cv-text': colors.text,
    '--cv-muted': colors.mutedText,
    '--cv-heading': colors.heading,
    '--cv-link': colors.link,
    '--cv-button': colors.buttonBackground,
    '--cv-button-text': colors.buttonText,
    '--cv-divider': colors.divider,
    '--cv-font': getFontStack(theme.fontStack),
    '--cv-heading-font': getFontStack(theme.headingFontStack),
    '--cv-width': `${theme.contentWidth}px`,
    '--cv-radius': `${theme.containerRadius}px`,
    '--cv-size': `${theme.baseFontSize}px`,
  } as CSSProperties

  return (
    <div
      className="nb-canvas"
      style={style}
      data-dragging={drag.payload !== null}
      onClick={() => editor.select(null)}
      onDragOver={(event) => {
        if (!drag.payload || !drag.canDropInto(null)) return
        event.preventDefault()
        drag.setTarget({ parentId: null, index: blocks.length })
      }}
      onDrop={(event) => {
        if (!drag.payload) return
        event.preventDefault()
        drag.commit()
      }}
    >
      <div className="nb-sheet">
        <BlockList parentId={null} blocks={blocks} />
      </div>
      <p className="nb-canvas-note">
        {BLOCK_DEFINITIONS.length} block types. Keyboard: Tab to a block, Alt+Arrow to move it, Delete to remove it.
      </p>
    </div>
  )
}
