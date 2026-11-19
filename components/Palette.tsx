'use client'

import { createBlock, createBlankDocument, createProductUpdateTemplate, createWelcomeTemplate } from '../templates'
import { BLOCK_DEFINITIONS, useBuilder } from './builder-context'
import { Icon } from './icons'

/**
 * The left-hand block palette. Blocks can be dragged onto the canvas or
 * added by click or keyboard (Enter / Space).
 *
 * @returns The palette and template shortcuts.
 * @internal
 */
export function Palette() {
  const { editor, drag } = useBuilder()

  const applyTemplate = (create: () => ReturnType<typeof createWelcomeTemplate>) => {
    if (editor.document.blocks.length > 0 && !window.confirm('Replace the current email with this template? You can undo this.')) return
    editor.replaceDocument(create())
  }

  return (
    <aside className="nb-palette" aria-label="Block palette">
      <h2 className="nb-panel-title">Blocks</h2>
      <p className="nb-panel-copy">Drag onto the canvas, or click to add after the selected block.</p>
      <ul className="nb-palette-list">
        {BLOCK_DEFINITIONS.map((definition) => (
          <li key={definition.type}>
            <button
              type="button"
              className="nb-palette-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', definition.type)
                event.dataTransfer.effectAllowed = 'copy'
                drag.setPayload({ kind: 'new', blockType: definition.type })
              }}
              onDragEnd={() => drag.setPayload(null)}
              onClick={() => editor.appendBlock(createBlock(definition.type))}
            >
              <span className="nb-palette-icon">
                <Icon name={definition.icon} size={18} />
              </span>
              <span className="nb-palette-text">
                <span className="nb-palette-label">{definition.label}</span>
                <span className="nb-palette-desc">{definition.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="nb-panel-title nb-panel-title-spaced">Templates</h2>
      <div className="nb-template-list">
        <button type="button" className="nb-btn nb-btn-block" onClick={() => applyTemplate(createWelcomeTemplate)}>
          Welcome email
        </button>
        <button type="button" className="nb-btn nb-btn-block" onClick={() => applyTemplate(createProductUpdateTemplate)}>
          Product update
        </button>
        <button type="button" className="nb-btn nb-btn-ghost nb-btn-block" onClick={() => applyTemplate(createBlankDocument)}>
          Blank
        </button>
      </div>
    </aside>
  )
}
