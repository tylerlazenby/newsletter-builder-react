'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { compileNewsletter } from '../compiler'
import type { ColorMode, NewsletterDocument } from '../types'

/**
 * Props for {@link NewsletterRenderer}.
 */
export interface NewsletterRendererProps {
  /** The document to render. */
  document: NewsletterDocument
  /**
   * Runtime merge-tag values. Always applied. Takes precedence over
   * `previewData`.
   */
  variables?: Record<string, string>
  /**
   * Sample merge-tag values used only for this preview, for example
   * `{ firstName: 'Ada' }`. Swap them at runtime to preview different customers.
   */
  previewData?: Record<string, string>
  /**
   * Colour scheme to preview. `'dark'` forces the dark rules; `'auto'` follows the
   * visitor's system setting, exactly like a real mail client.
   *
   * @defaultValue 'light'
   */
  colorMode?: ColorMode
  /**
   * Simulated viewport. `'mobile'` renders a 375px wide frame so the
   * responsive stacking rules apply.
   *
   * @defaultValue 'desktop'
   */
  device?: 'desktop' | 'mobile'
  /**
   * Size the frame to its content instead of filling the parent. Handy for
   * embedding a preview in a page.
   *
   * @defaultValue false
   */
  autoHeight?: boolean
  /** Accessible title for the frame. @defaultValue 'Email preview' */
  title?: string
  className?: string
  style?: CSSProperties
}

/**
 * Renders a {@link NewsletterDocument} exactly as it will be exported - the
 * compiled, table-based HTML inside a sandboxed `<iframe>`.
 *
 * @param props - See {@link NewsletterRendererProps}.
 * @returns A sandboxed iframe containing the compiled email.
 *
 * @remarks
 * The frame uses `sandbox="allow-same-origin allow-popups"` with **no**
 * `allow-scripts`, so the previewed HTML can never execute script. The
 * document is recompiled whenever `document`, `variables`, `previewData` or
 * `colorMode` change.
 *
 * @example
 * ```tsx
 * <NewsletterRenderer
 *   document={doc}
 *   previewData={{ firstName: 'Ada', company: 'Analytical Engines' }}
 *   variables={{ unsubscribeUrl: 'https://example.com/u/1' }}
 *   colorMode="dark"
 *   device="mobile"
 * />
 * ```
 */
export function NewsletterRenderer({
  document: newsletter,
  variables,
  previewData,
  colorMode = 'light',
  device = 'desktop',
  autoHeight = false,
  title = 'Email preview',
  className,
  style,
}: NewsletterRendererProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  const srcDoc = useMemo(() => {
    const { html } = compileNewsletter(newsletter, { variables, previewData, colorMode })
    return html.replace('<head>', '<head>\n<base target="_blank" />')
  }, [newsletter, variables, previewData, colorMode])

  const measure = useCallback(() => {
    const root = frame.current?.contentDocument?.documentElement
    if (root) setContentHeight(root.scrollHeight)
  }, [])

  useEffect(() => {
    if (!autoHeight) return
    const id = window.requestAnimationFrame(measure)
    return () => window.cancelAnimationFrame(id)
  }, [autoHeight, device, srcDoc, measure])

  return (
    <iframe
      ref={frame}
      title={title}
      className={className}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups"
      onLoad={measure}
      style={{
        display: 'block',
        border: 0,
        margin: '0 auto',
        width: device === 'mobile' ? 375 : '100%',
        maxWidth: '100%',
        height: autoHeight ? (contentHeight ?? 520) : '100%',
        ...style,
      }}
    />
  )
}
