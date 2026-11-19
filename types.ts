import type { FontStackId } from './constants'

/**
 * Every block type the builder can create.
 *
 * @remarks
 * `columns` is the only container block. It can only live at the root of a
 * document; its cells hold {@link LeafBlock}s.
 */
export type BlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'footer'

/** Horizontal alignment used by text-like blocks. */
export type TextAlign = 'left' | 'center' | 'right'

/**
 * Fields shared by every block.
 *
 * @typeParam T - The literal block type discriminator.
 */
export interface BaseBlock<T extends BlockType> {
  /** Stable unique id. Used for selection, drag-and-drop and React keys. */
  id: string
  /** Discriminator used to narrow the {@link NewsletterBlock} union. */
  type: T
}

/**
 * A heading block rendered as `<h1>`, `<h2>` or `<h3>`.
 *
 * @example
 * ```ts
 * const header: HeaderBlock = {
 *   id: 'h1', type: 'header', text: 'Hi {{firstName}}', level: 1, align: 'left',
 * }
 * ```
 */
export interface HeaderBlock extends BaseBlock<'header'> {
  /** Plain text. Merge tags such as `{{firstName}}` are allowed. */
  text: string
  /** Semantic heading level, which also controls the font size. */
  level: 1 | 2 | 3
  align: TextAlign
  /** Optional colour override. When set it is **not** swapped in dark mode. */
  color?: string
}

/**
 * A rich text paragraph block.
 *
 * @remarks
 * `html` is restricted to a small allow-list (`b`, `i`, `u`, `a`, `br`) and is
 * always passed through {@link sanitizeRichText} before it is compiled.
 */
export interface TextBlock extends BaseBlock<'text'> {
  /** Sanitised inline HTML. */
  html: string
  align: TextAlign
  /** Font size in pixels. */
  fontSize: number
}

/** An image block with alt text, width control and an optional link. */
export interface ImageBlock extends BaseBlock<'image'> {
  /** Absolute `https://` URL (recommended) or a `data:image/*` URL for previews. */
  src: string
  /** Alt text. Required for accessible emails; the linter flags empty values. */
  alt: string
  /** Rendered width as a percentage (10-100) of the available block width. */
  widthPercent: number
  align: TextAlign
  /** Optional URL the image links to. */
  href: string
}

/** A bulletproof call-to-action button. */
export interface ButtonBlock extends BaseBlock<'button'> {
  label: string
  /** Destination URL. Merge tags such as `{{unsubscribeUrl}}` are allowed. */
  href: string
  align: TextAlign
  /** Stretch the button to the full available width. */
  fullWidth: boolean
  /** Corner radius in pixels. */
  borderRadius: number
  /** Optional override. When set it is **not** swapped in dark mode. */
  backgroundColor?: string
  /** Optional override. When set it is **not** swapped in dark mode. */
  textColor?: string
}

/** A horizontal rule. */
export interface DividerBlock extends BaseBlock<'divider'> {
  /** Line thickness in pixels. */
  thickness: number
  style: 'solid' | 'dashed' | 'dotted'
  /** Width as a percentage of the available block width. */
  widthPercent: number
}

/** Empty vertical space. */
export interface SpacerBlock extends BaseBlock<'spacer'> {
  /** Height in pixels. */
  height: number
}

/**
 * Configurable unsubscribe and compliance footer.
 *
 * @remarks
 * Most jurisdictions (CAN-SPAM, GDPR/PECR, CASL) require a working unsubscribe
 * mechanism and a physical sender address in marketing email. Gmail and Yahoo
 * also expect one-click unsubscribe for bulk senders.
 */
export interface FooterBlock extends BaseBlock<'footer'> {
  /** Why the recipient is receiving this message. */
  reason: string
  companyName: string
  /** Postal address. Line breaks are preserved. */
  address: string
  unsubscribeLabel: string
  /** Usually `{{unsubscribeUrl}}` so your sender can fill it per recipient. */
  unsubscribeUrl: string
  showPreferences: boolean
  preferencesLabel: string
  preferencesUrl: string
  align: TextAlign
}

/** Any block that can be placed inside a column. */
export type LeafBlock =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | FooterBlock

/** One cell of a {@link ColumnsBlock}. */
export interface ColumnData {
  id: string
  /** Share of the row width in percent. Cells in a row should add up to 100. */
  widthPercent: number
  blocks: LeafBlock[]
}

/** A multi-column row (2-4 cells) that stacks on narrow screens. */
export interface ColumnsBlock extends BaseBlock<'columns'> {
  columns: ColumnData[]
  /** Horizontal gutter between cells in pixels. */
  gap: number
  /** Stack the cells vertically on small screens. */
  stackOnMobile: boolean
}

/** Discriminated union of every block. */
export type NewsletterBlock = LeafBlock | ColumnsBlock

/** The colour palette for one colour scheme. All values are hex colours. */
export interface ThemeColors {
  pageBackground: string
  contentBackground: string
  text: string
  mutedText: string
  heading: string
  link: string
  buttonBackground: string
  buttonText: string
  divider: string
}

/**
 * Document-wide visual settings.
 *
 * @remarks
 * `light` colours are written inline on every element. `dark` colours are only
 * emitted inside a `prefers-color-scheme: dark` media query (plus the
 * `[data-ogsc]` / `[data-ogsb]` selectors used by Outlook.com).
 */
export interface NewsletterTheme {
  /** Body font stack id. See {@link FONT_STACKS}. */
  fontStack: FontStackId
  /** Heading font stack id. */
  headingFontStack: FontStackId
  /** Width of the content column in pixels (480-720). */
  contentWidth: number
  /** Default text size in pixels. */
  baseFontSize: number
  /** Corner radius of the content container in pixels. */
  containerRadius: number
  light: ThemeColors
  dark: ThemeColors
}

/**
 * The serialisable newsletter document - the single source of truth the
 * builder edits and the compiler consumes.
 *
 * @example
 * ```ts
 * import { createWelcomeTemplate, compileNewsletter } from 'newsletter-builder-react'
 * const { html, text, subject } = compileNewsletter(createWelcomeTemplate(), {
 *   variables: { firstName: 'Ada' },
 * })
 * ```
 */
export interface NewsletterDocument {
  /** Schema version, currently always `1`. */
  version: 1
  /** Subject line. Merge tags are allowed. */
  subject: string
  /** Inbox preview text shown after the subject line. */
  preheader: string
  theme: NewsletterTheme
  blocks: NewsletterBlock[]
}

/** Which colour scheme to compile for. */
export type ColorMode = 'light' | 'dark' | 'auto'

/**
 * Options accepted by {@link compileNewsletter}.
 */
export interface CompileOptions {
  /**
   * Runtime merge-tag values. Always applied to the output (HTML values are
   * escaped). Tags without a value are left untouched so a downstream
   * template engine can still resolve them.
   */
  variables?: Record<string, string>
  /**
   * Sample values for previews. Merged **under** `variables`. Do not use this
   * for production sends.
   */
  previewData?: Record<string, string>
  /**
   * - `'auto'` (default): light inline colours plus a dark media query. Use for exports.
   * - `'light'`: light only, no dark rules.
   * - `'dark'`: dark rules are forced on. Use for in-app previews.
   */
  colorMode?: ColorMode
  /** `lang` attribute for the `<html>` element. Defaults to `en`. */
  lang?: string
  /** Text direction. Defaults to `ltr`. */
  dir?: 'ltr' | 'rtl'
}

/**
 * Provider-agnostic compile result. Pass it straight to any SMTP library,
 * transactional API or marketing platform.
 *
 * @example
 * ```ts
 * const email: CompiledEmail = compileNewsletter(doc)
 * await provider.send({ to, subject: email.subject, html: email.html, text: email.text })
 * ```
 */
export interface CompiledEmail {
  /** Complete table-based, inline-styled HTML document. */
  html: string
  /** Plain-text alternative for the `text/plain` MIME part. */
  text: string
  /** Subject line with merge tags resolved where values were supplied. */
  subject: string
}

/** Describes a merge tag offered in the editor's variable menus. */
export interface MergeTagDefinition {
  /** Tag name without braces, e.g. `firstName`. */
  name: string
  /** Human readable label. */
  label: string
  /** Realistic sample value used for previews. */
  example: string
}

/** Severity of a {@link LintIssue}. */
export type LintSeverity = 'error' | 'warning' | 'info'

/** A problem found by {@link lintNewsletter}. */
export interface LintIssue {
  severity: LintSeverity
  /** Stable machine readable code, e.g. `image-missing-alt`. */
  code: string
  message: string
  /** Id of the offending block, when the issue is block specific. */
  blockId?: string
}

/** Where a block can be inserted: a column id (or `null` for the root) and an index. */
export interface BlockLocation {
  /** `null` for the document root, otherwise the id of a {@link ColumnData}. */
  parentId: string | null
  index: number
}
