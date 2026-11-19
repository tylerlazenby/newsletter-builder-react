import { getFontStack } from './constants'
import { applyMergeTags, escapeHtml } from './merge-tags'
import { renderPlainText } from './plain-text'
import { sanitizeRichText, sanitizeUrl } from './sanitize'
import type {
  ColumnsBlock,
  CompileOptions,
  CompiledEmail,
  LeafBlock,
  NewsletterBlock,
  NewsletterDocument,
  TextAlign,
  ThemeColors,
} from './types'

interface RenderContext {
  colors: ThemeColors
  bodyFont: string
  headingFont: string
  baseFontSize: number
  padX: number
  availableWidth: number
}

const HEADING_SIZES = { 1: 30, 2: 24, 3: 19 } as const
const TABLE_RESET = 'role="presentation" border="0" cellpadding="0" cellspacing="0"'

function sanitizeColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function normalizeAlign(align: TextAlign | undefined): TextAlign {
  return align === 'center' || align === 'right' ? align : 'left'
}

function row(
  context: RenderContext,
  inner: string,
  options: { padY: number; align?: TextAlign; className?: string; style?: string },
): string {
  const classes = [context.padX > 0 ? 'nb-pad' : '', options.className ?? ''].filter(Boolean).join(' ')
  const align = options.align ? ` align="${options.align}"` : ''
  const classAttr = classes ? ` class="${classes}"` : ''
  const style = `padding:${options.padY}px ${context.padX}px;${options.style ?? ''}`
  return `<tr><td${align}${classAttr} style="${style}">${inner}</td></tr>`
}

function styleLinks(html: string, colors: ThemeColors, className = 'nb-link'): string {
  return html.replace(
    /<a href="/g,
    `<a class="${className}" style="color:${colors.link};text-decoration:underline;" href="`,
  )
}

function renderLeaf(block: LeafBlock, context: RenderContext): string {
  const { colors } = context
  switch (block.type) {
    case 'header': {
      const level = block.level === 2 || block.level === 3 ? block.level : 1
      const align = normalizeAlign(block.align)
      const custom = block.color ? sanitizeColor(block.color, colors.heading) : null
      const color = custom ?? colors.heading
      const size = HEADING_SIZES[level]
      return row(context, `<h${level} style="margin:0;padding:0;font-family:inherit;font-size:inherit;line-height:inherit;font-weight:inherit;color:inherit;">${escapeHtml(block.text)}</h${level}>`, {
        padY: 12,
        align,
        className: custom ? '' : 'nb-heading',
        style: `font-family:${context.headingFont};font-size:${size}px;line-height:1.25;font-weight:700;color:${color};text-align:${align};`,
      })
    }
    case 'text': {
      const align = normalizeAlign(block.align)
      const size = clamp(block.fontSize, 11, 28)
      const html = styleLinks(sanitizeRichText(block.html), colors)
      return row(context, html, {
        padY: 8,
        align,
        className: 'nb-text',
        style: `font-family:${context.bodyFont};font-size:${size}px;line-height:1.6;color:${colors.text};text-align:${align};`,
      })
    }
    case 'image': {
      const src = sanitizeUrl(block.src, { allowDataImage: true })
      if (!src) return ''
      const align = normalizeAlign(block.align)
      const percent = clamp(block.widthPercent, 5, 100)
      const pixels = Math.max(1, Math.round((context.availableWidth * percent) / 100))
      const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" width="${pixels}" style="display:block;width:100%;max-width:${pixels}px;height:auto;border:0;outline:none;text-decoration:none;" />`
      const href = block.href ? sanitizeUrl(block.href) : ''
      const content = href ? `<a href="${escapeHtml(href)}" style="text-decoration:none;">${img}</a>` : img
      const table = `<table ${TABLE_RESET} width="${percent}%" align="${align}" style="width:${percent}%;"><tr><td>${content}</td></tr></table>`
      return row(context, table, { padY: 8, align })
    }
    case 'button': {
      const align = normalizeAlign(block.align)
      const background = block.backgroundColor ? sanitizeColor(block.backgroundColor, colors.buttonBackground) : null
      const foreground = block.textColor ? sanitizeColor(block.textColor, colors.buttonText) : null
      const bg = background ?? colors.buttonBackground
      const fg = foreground ?? colors.buttonText
      const radius = clamp(block.borderRadius, 0, 40)
      const href = sanitizeUrl(block.href) || '#'
      const width = block.fullWidth ? ' width="100%" style="width:100%;"' : ''
      const link = `<a href="${escapeHtml(href)}" class="${foreground ? '' : 'nb-btn-a'}" target="_blank" style="display:${block.fullWidth ? 'block' : 'inline-block'};padding:14px 28px;font-family:${context.bodyFont};font-size:16px;font-weight:700;line-height:1.2;color:${fg};text-decoration:none;text-align:center;border-radius:${radius}px;">${escapeHtml(block.label)}</a>`
      const cell = `<td align="center" bgcolor="${bg}" class="${background ? '' : 'nb-btn'}" style="background-color:${bg};border-radius:${radius}px;mso-padding-alt:14px 28px;">${link}</td>`
      return row(context, `<table ${TABLE_RESET} align="${align}"${width}><tr>${cell}</tr></table>`, { padY: 12, align })
    }
    case 'divider': {
      const align = normalizeAlign('center')
      const percent = clamp(block.widthPercent, 10, 100)
      const thickness = clamp(block.thickness, 1, 8)
      const style = block.style === 'dashed' || block.style === 'dotted' ? block.style : 'solid'
      const table = `<table ${TABLE_RESET} width="${percent}%" align="${align}" style="width:${percent}%;"><tr><td class="nb-divider" height="${thickness}" style="height:${thickness}px;font-size:0;line-height:0;border-top:${thickness}px ${style} ${colors.divider};">&nbsp;</td></tr></table>`
      return row(context, table, { padY: 16, align })
    }
    case 'spacer': {
      const height = clamp(block.height, 4, 160)
      return `<tr><td height="${height}" style="height:${height}px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>`
    }
    case 'footer': {
      const align = normalizeAlign(block.align)
      const parts: string[] = []
      const paragraph = (inner: string) => `<p style="margin:0 0 10px 0;">${inner}</p>`
      if (block.reason) parts.push(paragraph(escapeHtml(block.reason)))
      const identity = [block.companyName, block.address].filter(Boolean).map((line) => escapeHtml(line).replace(/\r?\n/g, '<br />'))
      if (identity.length) parts.push(paragraph(identity.join('<br />')))
      const links: string[] = []
      const unsubscribeHref = sanitizeUrl(block.unsubscribeUrl)
      if (unsubscribeHref) {
        links.push(`<a class="nb-link" href="${escapeHtml(unsubscribeHref)}" style="color:${colors.link};text-decoration:underline;">${escapeHtml(block.unsubscribeLabel)}</a>`)
      }
      const preferencesHref = sanitizeUrl(block.preferencesUrl)
      if (block.showPreferences && preferencesHref) {
        links.push(`<a class="nb-link" href="${escapeHtml(preferencesHref)}" style="color:${colors.link};text-decoration:underline;">${escapeHtml(block.preferencesLabel)}</a>`)
      }
      if (links.length) parts.push(paragraph(links.join(' &nbsp;|&nbsp; ')))
      return row(context, parts.join(''), {
        padY: 24,
        align,
        className: 'nb-muted',
        style: `font-family:${context.bodyFont};font-size:13px;line-height:1.6;color:${colors.mutedText};text-align:${align};`,
      })
    }
  }
}

function renderColumns(block: ColumnsBlock, context: RenderContext): string {
  const count = block.columns.length
  if (count === 0) return ''
  const gap = clamp(block.gap, 0, 64)
  const cells = block.columns.map((column, index) => {
    const left = index === 0 ? 0 : Math.round(gap / 2)
    const right = index === count - 1 ? 0 : Math.round(gap / 2)
    const widthPercent = clamp(column.widthPercent, 10, 100)
    const childContext: RenderContext = {
      ...context,
      padX: 0,
      availableWidth: Math.round(((context.availableWidth - gap * (count - 1)) * widthPercent) / 100),
    }
    const rows = column.blocks.map((child) => renderLeaf(child, childContext)).filter(Boolean).join('\n')
    const inner = rows || '<tr><td style="font-size:0;line-height:0;">&nbsp;</td></tr>'
    const className = block.stackOnMobile ? 'nb-col nb-stack' : 'nb-col'
    return `<td class="${className}" width="${widthPercent}%" valign="top" style="width:${widthPercent}%;padding:0 ${right}px 0 ${left}px;vertical-align:top;"><table ${TABLE_RESET} width="100%">\n${rows ? rows : inner}\n</table></td>`
  })
  const inner = `<table ${TABLE_RESET} width="100%"><tr>${cells.join('')}</tr></table>`
  return row(context, inner, { padY: 0 })
}

function renderBlock(block: NewsletterBlock, context: RenderContext): string {
  return block.type === 'columns' ? renderColumns(block, context) : renderLeaf(block, context)
}

function darkRules(colors: ThemeColors): string {
  return [
    `.nb-page{background-color:${colors.pageBackground} !important;}`,
    `.nb-container{background-color:${colors.contentBackground} !important;}`,
    `.nb-text{color:${colors.text} !important;}`,
    `.nb-muted{color:${colors.mutedText} !important;}`,
    `.nb-heading{color:${colors.heading} !important;}`,
    `.nb-link{color:${colors.link} !important;}`,
    `.nb-btn{background-color:${colors.buttonBackground} !important;}`,
    `.nb-btn-a{color:${colors.buttonText} !important;}`,
    `.nb-divider{border-top-color:${colors.divider} !important;}`,
  ].join('\n')
}

function outlookDarkRules(colors: ThemeColors): string {
  return [
    `[data-ogsb] .nb-page{background-color:${colors.pageBackground} !important;}`,
    `[data-ogsb] .nb-container{background-color:${colors.contentBackground} !important;}`,
    `[data-ogsb] .nb-btn{background-color:${colors.buttonBackground} !important;}`,
    `[data-ogsc] .nb-text{color:${colors.text} !important;}`,
    `[data-ogsc] .nb-muted{color:${colors.mutedText} !important;}`,
    `[data-ogsc] .nb-heading{color:${colors.heading} !important;}`,
    `[data-ogsc] .nb-link{color:${colors.link} !important;}`,
    `[data-ogsc] .nb-btn-a{color:${colors.buttonText} !important;}`,
  ].join('\n')
}

/**
 * Compiles a {@link NewsletterDocument} into a cross-client HTML email, a
 * plain-text alternative and a subject line.
 *
 * @param document - The document produced by the builder or written by hand.
 * @param options - See {@link CompileOptions}.
 * @returns A {@link CompiledEmail} you can pass to any provider.
 *
 * @remarks
 * **Output rules**
 * - Layout uses nested `<table role="presentation">` elements only - no Flexbox,
 *   Grid, floats or external stylesheets.
 * - All light-scheme styling is inlined. The `<style>` block holds only resets,
 *   the mobile breakpoint and the dark-mode rules.
 * - `<meta name="color-scheme">` and `<meta name="supported-color-schemes">`
 *   are emitted, with a `prefers-color-scheme: dark` media query plus the
 *   `[data-ogsc]` / `[data-ogsb]` selectors for Outlook.com.
 * - Rich text is sanitised and URLs are scheme-checked (no `javascript:`).
 * - Merge-tag values from `variables` are HTML-escaped. Unknown tags are left
 *   untouched for downstream engines.
 *
 * The function is pure and has no DOM or Node dependency, so it runs in the
 * browser, in Server Components, route handlers and edge runtimes.
 *
 * @example
 * ```ts
 * import { compileNewsletter, createWelcomeTemplate } from 'newsletter-builder-react'
 *
 * const { html, text, subject } = compileNewsletter(createWelcomeTemplate(), {
 *   variables: { firstName: 'Ada', unsubscribeUrl: 'https://example.com/u/123' },
 * })
 * ```
 */
export function compileNewsletter(document: NewsletterDocument, options: CompileOptions = {}): CompiledEmail {
  const { theme } = document
  const mode = options.colorMode ?? 'auto'
  const width = clamp(theme.contentWidth, 320, 800)
  const light = theme.light
  const dark = theme.dark
  const data = { ...options.previewData, ...options.variables }

  const context: RenderContext = {
    colors: light,
    bodyFont: getFontStack(theme.fontStack),
    headingFont: getFontStack(theme.headingFontStack),
    baseFontSize: theme.baseFontSize,
    padX: 32,
    availableWidth: width - 64,
  }

  const body = document.blocks.map((block) => renderBlock(block, context)).filter(Boolean).join('\n')

  const scheme = mode === 'light' ? 'light' : 'light dark'
  const darkBlock =
    mode === 'dark'
      ? `@media all {\n${darkRules(dark)}\n}`
      : mode === 'auto'
        ? `@media (prefers-color-scheme: dark) {\n${darkRules(dark)}\n}\n${outlookDarkRules(dark)}`
        : ''

  const preheader = document.preheader.trim()
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}${'&#8204;&nbsp;'.repeat(60)}</div>`
    : ''

  const lang = options.lang ?? 'en'
  const dir = options.dir ?? 'ltr'
  const radius = clamp(theme.containerRadius, 0, 32)

  const html = [
    '<!DOCTYPE html>',
    `<html lang="${escapeHtml(lang)}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`,
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge" />',
    '<meta name="x-apple-disable-message-reformatting" />',
    '<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />',
    `<meta name="color-scheme" content="${scheme}" />`,
    `<meta name="supported-color-schemes" content="${scheme}" />`,
    `<title>${escapeHtml(document.subject)}</title>`,
    '<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->',
    '<style>',
    `:root{color-scheme:${scheme};supported-color-schemes:${scheme};}`,
    'body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}',
    'table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}',
    'img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}',
    'a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}',
    `@media only screen and (max-width:${width + 20}px){`,
    '.nb-container{width:100% !important;max-width:100% !important;border-radius:0 !important;}',
    '.nb-pad{padding-left:20px !important;padding-right:20px !important;}',
    '.nb-stack{display:block !important;width:100% !important;padding-left:0 !important;padding-right:0 !important;padding-bottom:16px !important;}',
    '}',
    darkBlock,
    '</style>',
    '</head>',
    `<body class="nb-page" style="margin:0;padding:0;width:100%;background-color:${light.pageBackground};">`,
    preheaderHtml,
    `<table ${TABLE_RESET} width="100%" class="nb-page" bgcolor="${light.pageBackground}" style="background-color:${light.pageBackground};"><tr><td align="center" style="padding:24px 12px;">`,
    `<!--[if mso]><table role="presentation" width="${width}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`,
    `<table ${TABLE_RESET} width="${width}" class="nb-container" bgcolor="${light.contentBackground}" style="width:100%;max-width:${width}px;background-color:${light.contentBackground};border-radius:${radius}px;border-collapse:separate;overflow:hidden;">`,
    body,
    '</table>',
    '<!--[if mso]></td></tr></table><![endif]-->',
    '</td></tr></table>',
    '</body>',
    '</html>',
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    html: applyMergeTags(html, data, { escapeValues: true }),
    text: applyMergeTags(renderPlainText(document), data),
    subject: applyMergeTags(document.subject, data),
  }
}
