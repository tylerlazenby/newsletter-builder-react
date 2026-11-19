'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { compileNewsletter } from '../compiler'
import { DEFAULT_MERGE_TAGS, DEFAULT_PREVIEW_DATA } from '../constants'
import { useNewsletterEditor } from '../editor-state'
import { lintNewsletter } from '../lint'
import { createBlankDocument } from '../templates'
import type { CompiledEmail, MergeTagDefinition, NewsletterDocument } from '../types'
import { BuilderProvider, useDragController } from './builder-context'
import { Canvas } from './Canvas'
import { CodeView } from './CodeView'
import { Icon } from './icons'
import { Inspector } from './Inspector'
import { NewsletterRenderer } from './NewsletterRenderer'
import { Palette } from './Palette'
import { Tooltip } from './Tooltip'
import { Walkthrough } from './Walkthrough'

/** The main views of the builder. */
export type BuilderView = 'edit' | 'preview' | 'html' | 'text'

/** The export action that triggered {@link NewsletterBuilderProps.onExport}. */
export type ExportAction = 'copy-html' | 'copy-text' | 'download-html'

/**
 * Props for {@link NewsletterBuilder}.
 *
 * @example
 * ```tsx
 * <NewsletterBuilder
 *   initialDocument={createWelcomeTemplate()}
 *   variables={{ unsubscribeUrl: 'https://example.com/u/123' }}
 *   previewData={DEFAULT_PREVIEW_DATA}
 *   onChange={(doc) => save(doc)}
 * />
 * ```
 */
export interface NewsletterBuilderProps {
  /**
   * The document to start from. Read once on mount; the builder owns the
   * state afterwards. Use `key` to remount with a different document.
   *
   * @defaultValue An empty document
   */
  initialDocument?: NewsletterDocument
  /** Called after every committed edit with the new document. Not called on mount. */
  onChange?: (document: NewsletterDocument) => void
  /**
   * Runtime customer variables, for example
   * `{ firstName: 'Ada', unsubscribeUrl: '...' }`. They are applied to the
   * canvas, the preview **and** the exported HTML, and cannot be edited in the UI.
   * Change them at any time to swap customer data dynamically.
   */
  variables?: Record<string, string>
  /**
   * Realistic sample data for previews (not exported). Seeds the editable
   * "Variables" tab and is re-read when its identity changes, so define it
   * outside the component or memoise it.
   *
   * @defaultValue {@link DEFAULT_PREVIEW_DATA}
   */
  previewData?: Record<string, string>
  /** Called when someone edits a sample value in the Variables tab. */
  onPreviewDataChange?: (data: Record<string, string>) => void
  /**
   * Merge tags offered in the Variable menus and Variables tab.
   *
   * @defaultValue {@link DEFAULT_MERGE_TAGS}
   */
  mergeTags?: MergeTagDefinition[]
  /**
   * Upload handler for image blocks. Return a public `https://` URL.
   * Without it, uploads are embedded as data URLs for preview only.
   */
  onImageUpload?: (file: File) => Promise<string>
  /** Called when the person copies or downloads the compiled email. */
  onExport?: (email: CompiledEmail, action: ExportAction) => void
  /**
   * Show the quick-start walkthrough on mount.
   *
   * @defaultValue true
   */
  showWalkthrough?: boolean
  /** Called when the walkthrough is dismissed - persist this if you only want to show it once. */
  onWalkthroughDismiss?: () => void
  /** Initial view. @defaultValue 'edit' */
  defaultView?: BuilderView
  /** Initial preview colour scheme. @defaultValue 'light' */
  defaultColorMode?: 'light' | 'dark'
  /** Colour theme of the editor chrome itself. @defaultValue 'light' */
  uiTheme?: 'light' | 'dark'
  /** CSS height of the builder. @defaultValue '100%' */
  height?: number | string
  className?: string
}

const NO_VARIABLES: Record<string, string> = {}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'newsletter'
  )
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * A complete, embeddable drag-and-drop email builder.
 *
 * @param props - See {@link NewsletterBuilderProps}.
 * @returns The builder UI. It fills its parent, so give the parent a height.
 *
 * @remarks
 * - Import `newsletter-builder-react/styles.css` once in your app.
 * - The builder is provider-agnostic: it never sends email. Use
 *   {@link compileNewsletter} (or the **Copy HTML** button) to obtain
 *   `{ html, text, subject }` and hand it to any SMTP service, API or marketing platform.
 * - Drag-and-drop uses the native HTML5 API; every action also has a button or
 *   keyboard equivalent (Tab to a block, `Alt+Arrow` to move, `Delete` to remove).
 * - `variables` are applied to the exported HTML; `previewData` is for previews only.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { NewsletterBuilder, createWelcomeTemplate } from 'newsletter-builder-react'
 * import 'newsletter-builder-react/styles.css'
 *
 * export default function Page() {
 *   return (
 *     <div style={{ height: '100vh' }}>
 *       <NewsletterBuilder initialDocument={createWelcomeTemplate()} />
 *     </div>
 *   )
 * }
 * ```
 */
export function NewsletterBuilder({
  initialDocument,
  onChange,
  variables = NO_VARIABLES,
  previewData: previewDataProp,
  onPreviewDataChange,
  mergeTags = DEFAULT_MERGE_TAGS,
  onImageUpload,
  onExport,
  showWalkthrough = true,
  onWalkthroughDismiss,
  defaultView = 'edit',
  defaultColorMode = 'light',
  uiTheme = 'light',
  height = '100%',
  className,
}: NewsletterBuilderProps) {
  const [seed] = useState(() => initialDocument ?? createBlankDocument())
  const editor = useNewsletterEditor(seed, onChange)
  const drag = useDragController(editor)

  const [view, setView] = useState<BuilderView>(defaultView)
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(defaultColorMode)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [sampleOn, setSampleOn] = useState(true)
  const [walkthroughOpen, setWalkthroughOpen] = useState(showWalkthrough)
  const [status, setStatus] = useState('')
  const [previewData, setPreviewData] = useState<Record<string, string>>(() => previewDataProp ?? DEFAULT_PREVIEW_DATA)

  useEffect(() => {
    if (previewDataProp) setPreviewData(previewDataProp)
  }, [previewDataProp])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(''), 2400)
    return () => window.clearTimeout(timer)
  }, [status])

  const hasVariables = Object.keys(variables).length > 0
  const canvasData = useMemo(
    () => (sampleOn ? { ...previewData, ...variables } : hasVariables ? variables : null),
    [sampleOn, previewData, variables, hasVariables],
  )

  const exported = useMemo<CompiledEmail | null>(
    () => (view === 'html' || view === 'text' ? compileNewsletter(editor.document, { variables, colorMode: 'auto' }) : null),
    [view, editor.document, variables],
  )
  const issues = useMemo(
    () => (view === 'html' && exported ? lintNewsletter(editor.document, exported.html) : []),
    [view, exported, editor.document],
  )

  const compileForExport = useCallback(
    () => compileNewsletter(editor.document, { variables, colorMode: 'auto' }),
    [editor.document, variables],
  )

  const copy = useCallback(
    async (kind: 'html' | 'text') => {
      const email = compileForExport()
      const ok = await writeClipboard(kind === 'html' ? email.html : email.text)
      setStatus(ok ? (kind === 'html' ? 'HTML copied to clipboard' : 'Plain text copied to clipboard') : 'Copy failed - select the code and copy manually')
      if (ok) onExport?.(email, kind === 'html' ? 'copy-html' : 'copy-text')
    },
    [compileForExport, onExport],
  )

  const download = useCallback(() => {
    const email = compileForExport()
    const url = URL.createObjectURL(new Blob([email.html], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugify(email.subject)}.html`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('HTML file downloaded')
    onExport?.(email, 'download-html')
  }, [compileForExport, onExport])

  const dismissWalkthrough = useCallback(() => {
    setWalkthroughOpen(false)
    onWalkthroughDismiss?.()
  }, [onWalkthroughDismiss])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) editor.redo()
      else editor.undo()
    }
  }

  const context = useMemo(
    () => ({ editor, colorMode, data: canvasData, mergeTags, drag, onImageUpload }),
    [editor, colorMode, canvasData, mergeTags, drag, onImageUpload],
  )

  const views = [
    { id: 'edit', label: 'Edit', icon: 'edit' },
    { id: 'preview', label: 'Preview', icon: 'eye' },
    { id: 'html', label: 'HTML', icon: 'code' },
    { id: 'text', label: 'Text', icon: 'file' },
  ] as const

  const previewProps = {
    document: editor.document,
    variables,
    previewData: sampleOn ? previewData : undefined,
    colorMode,
    device,
  } as const

  const rootStyle: CSSProperties = { height }

  return (
    <BuilderProvider value={context}>
      <div className={`nb-root${className ? ` ${className}` : ''}`} data-ui-theme={uiTheme} style={rootStyle} onKeyDown={onKeyDown}>
        <div className="nb-toolbar" role="toolbar" aria-label="Builder toolbar">
          <div className="nb-segmented nb-views" role="tablist" aria-label="View">
            {views.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                className="nb-segment"
                data-active={view === item.id}
                onClick={() => setView(item.id)}
              >
                <Icon name={item.icon} /> <span className="nb-hide-sm">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="nb-toolbar-group">
            <Tooltip label="Undo (Ctrl+Z)" side="bottom">
              <button type="button" className="nb-icon-btn" aria-label="Undo" disabled={!editor.canUndo} onClick={editor.undo}>
                <Icon name="undo" />
              </button>
            </Tooltip>
            <Tooltip label="Redo (Ctrl+Shift+Z)" side="bottom">
              <button type="button" className="nb-icon-btn" aria-label="Redo" disabled={!editor.canRedo} onClick={editor.redo}>
                <Icon name="redo" />
              </button>
            </Tooltip>
          </div>

          <div className="nb-segmented" role="radiogroup" aria-label="Colour scheme">
            <Tooltip label="Preview in light mode" side="bottom">
              <button type="button" role="radio" aria-checked={colorMode === 'light'} className="nb-segment" data-active={colorMode === 'light'} onClick={() => setColorMode('light')}>
                <Icon name="sun" /> <span className="nb-hide-sm">Light</span>
              </button>
            </Tooltip>
            <Tooltip label="Preview in dark mode" side="bottom">
              <button type="button" role="radio" aria-checked={colorMode === 'dark'} className="nb-segment" data-active={colorMode === 'dark'} onClick={() => setColorMode('dark')}>
                <Icon name="moon" /> <span className="nb-hide-sm">Dark</span>
              </button>
            </Tooltip>
          </div>

          {view === 'preview' || view === 'html' ? (
            <div className="nb-segmented" role="radiogroup" aria-label="Device">
              <button type="button" role="radio" aria-checked={device === 'desktop'} aria-label="Desktop" className="nb-segment" data-active={device === 'desktop'} onClick={() => setDevice('desktop')}>
                <Icon name="desktop" />
              </button>
              <button type="button" role="radio" aria-checked={device === 'mobile'} aria-label="Mobile" className="nb-segment" data-active={device === 'mobile'} onClick={() => setDevice('mobile')}>
                <Icon name="mobile" />
              </button>
            </div>
          ) : null}

          <Tooltip label="Fill merge tags with sample data in the canvas and preview" side="bottom">
            <label className="nb-switch-label">
              <input type="checkbox" role="switch" className="nb-switch" checked={sampleOn} onChange={(event) => setSampleOn(event.target.checked)} />
              <span>Sample data</span>
            </label>
          </Tooltip>

          <div className="nb-toolbar-spacer" />

          <Tooltip label="Quick start guide" side="bottom">
            <button type="button" className="nb-icon-btn" aria-label="Open quick start guide" onClick={() => setWalkthroughOpen(true)}>
              <Icon name="help" />
            </button>
          </Tooltip>
          <Tooltip label="Download .html file" side="bottom">
            <button type="button" className="nb-btn" onClick={download}>
              <Icon name="download" /> <span className="nb-hide-sm">Download</span>
            </button>
          </Tooltip>
          <Tooltip label="Copy production-ready HTML" side="bottom">
            <button type="button" className="nb-btn nb-btn-primary" onClick={() => void copy('html')}>
              <Icon name="copy" /> Copy HTML
            </button>
          </Tooltip>
        </div>

        <div className="nb-main" data-view={view}>
          {view === 'edit' ? (
            <>
              <Palette />
              <section className="nb-stage" aria-label="Email canvas">
                <Canvas />
              </section>
              <Inspector
                variables={variables}
                previewData={previewData}
                onPreviewDataChange={(next) => {
                  setPreviewData(next)
                  onPreviewDataChange?.(next)
                }}
                onReset={() => {
                  const next = previewDataProp ?? DEFAULT_PREVIEW_DATA
                  setPreviewData(next)
                  onPreviewDataChange?.(next)
                }}
              />
            </>
          ) : null}

          {view === 'preview' ? (
            <section className="nb-preview-stage" aria-label="Email preview">
              <NewsletterRenderer {...previewProps} />
            </section>
          ) : null}

          {view === 'html' && exported ? (
            <div className="nb-split">
              <CodeView title="Compiled HTML" code={exported.html} issues={issues} onCopy={() => void copy('html')} />
              <section className="nb-preview-stage" aria-label="Live preview">
                <NewsletterRenderer {...previewProps} />
              </section>
            </div>
          ) : null}

          {view === 'text' && exported ? (
            <div className="nb-split">
              <CodeView title="Plain-text alternative" code={exported.text} onCopy={() => void copy('text')} />
              <section className="nb-code" aria-label="Subject">
                <header className="nb-code-head">
                  <h2 className="nb-panel-title">Subject line</h2>
                </header>
                <pre className="nb-pre nb-pre-short">
                  <code>{exported.subject}</code>
                </pre>
                <p className="nb-panel-copy">
                  Send this as the <code>text/plain</code> part next to the HTML. It improves deliverability and is what screen readers and strict gateways fall back to.
                </p>
              </section>
            </div>
          ) : null}

          {walkthroughOpen ? <Walkthrough onDismiss={dismissWalkthrough} /> : null}
        </div>

        <div className="nb-status" role="status" aria-live="polite">
          {status}
        </div>
      </div>
    </BuilderProvider>
  )
}
