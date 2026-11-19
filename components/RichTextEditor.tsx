'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MergeTagDefinition } from '../types'
import { sanitizeRichText, sanitizeUrl } from '../sanitize'
import { Icon } from './icons'
import { MergeTagMenu } from './Fields'
import { Tooltip } from './Tooltip'

/**
 * Props for {@link RichTextEditor}.
 *
 * @internal
 */
export interface RichTextEditorProps {
  /** Visible label. */
  label: string
  /** Sanitised inline HTML. */
  value: string
  /** Receives sanitised HTML on every edit. */
  onChange: (html: string) => void
  mergeTags: MergeTagDefinition[]
}

/**
 * A minimal `contentEditable` editor for bold, italic, underline, links and
 * merge tags. Output is always passed through {@link sanitizeRichText}.
 *
 * @param props - See {@link RichTextEditorProps}.
 * @returns A toolbar plus an editable region.
 *
 * @remarks
 * The editor only writes to the DOM when the incoming `value` differs from the
 * last value it emitted, which keeps the caret stable while typing.
 *
 * @internal
 */
export function RichTextEditor({ label, value, onChange, mergeTags }: RichTextEditorProps) {
  const labelId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef<string | null>(null)
  const savedRange = useRef<Range | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkError, setLinkError] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (host && value !== lastEmitted.current) {
      host.innerHTML = value
      lastEmitted.current = value
    }
  }, [value])

  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection()
      const host = hostRef.current
      if (selection && selection.rangeCount > 0 && host?.contains(selection.anchorNode)) {
        savedRange.current = selection.getRangeAt(0).cloneRange()
      }
    }
    document.addEventListener('selectionchange', remember)
    return () => document.removeEventListener('selectionchange', remember)
  }, [])

  const emit = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const html = sanitizeRichText(host.innerHTML)
    lastEmitted.current = html
    onChange(html)
  }, [onChange])

  const restoreSelection = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    host.focus()
    const range = savedRange.current
    if (range) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [])

  const run = useCallback(
    (command: string, argument?: string) => {
      restoreSelection()
      document.execCommand(command, false, argument)
      emit()
    },
    [emit, restoreSelection],
  )

  const applyLink = () => {
    const safe = sanitizeUrl(linkUrl)
    if (!safe || safe === 'https://') {
      setLinkError(true)
      return
    }
    setLinkError(false)
    setLinkOpen(false)
    run('createLink', safe)
    setLinkUrl('https://')
  }

  const tools = [
    { icon: 'bold', title: 'Bold (Ctrl+B)', command: 'bold' },
    { icon: 'italic', title: 'Italic (Ctrl+I)', command: 'italic' },
    { icon: 'underline', title: 'Underline (Ctrl+U)', command: 'underline' },
  ] as const

  return (
    <div className="nb-field">
      <div className="nb-field-head">
        <span id={labelId} className="nb-label">
          {label}
        </span>
        <MergeTagMenu tags={mergeTags} onPick={(tag) => run('insertText', tag)} />
      </div>
      <div className="nb-rte">
        <div className="nb-rte-toolbar" role="toolbar" aria-label="Text formatting">
          {tools.map((tool) => (
            <Tooltip key={tool.command} label={tool.title}>
              <button
                type="button"
                className="nb-icon-btn"
                aria-label={tool.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(tool.command)}
              >
                <Icon name={tool.icon} />
              </button>
            </Tooltip>
          ))}
          <Tooltip label="Add link to selected text">
            <button
              type="button"
              className="nb-icon-btn"
              aria-label="Add link"
              aria-expanded={linkOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setLinkOpen((open) => !open)}
            >
              <Icon name="link" />
            </button>
          </Tooltip>
          <Tooltip label="Remove link">
            <button
              type="button"
              className="nb-icon-btn"
              aria-label="Remove link"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run('unlink')}
            >
              <Icon name="close" />
            </button>
          </Tooltip>
        </div>
        {linkOpen ? (
          <div className="nb-rte-link">
            <input
              className="nb-input"
              aria-label="Link URL"
              aria-invalid={linkError}
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }
              }}
            />
            <button type="button" className="nb-btn nb-btn-primary nb-btn-sm" onClick={applyLink}>
              Apply
            </button>
          </div>
        ) : null}
        {linkError ? <p className="nb-error">Enter a valid http(s), mailto, tel or {'{{variable}}'} URL.</p> : null}
        <div
          ref={hostRef}
          className="nb-rte-area"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          onInput={emit}
          onPaste={(event) => {
            event.preventDefault()
            const text = event.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, text)
          }}
        />
      </div>
      <p className="nb-hint">Press Enter for a line break. Pasted text is stripped of formatting.</p>
    </div>
  )
}
