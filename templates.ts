import { DEFAULT_THEME } from './constants'
import { createId } from './tree'
import type {
  BlockType,
  ColumnData,
  ColumnsBlock,
  FooterBlock,
  ImageBlock,
  LeafBlock,
  NewsletterBlock,
  NewsletterDocument,
} from './types'

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260"><rect width="600" height="260" fill="#e6eaf4"/><path d="M0 220 170 120l90 60 110-90 230 140v30H0z" fill="#c5cde3"/><circle cx="450" cy="70" r="26" fill="#f3f5fb"/><text x="300" y="248" font-family="Arial,sans-serif" font-size="14" fill="#6b7592" text-anchor="middle">Replace with your image (600 x 260)</text></svg>'

/**
 * Inline SVG placeholder used by new image blocks.
 *
 * @remarks
 * Data URLs render in the editor but are blocked by Gmail and Outlook, so
 * {@link lintNewsletter} flags them until you host a real image.
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`

/**
 * Default footer values, exposed so hosts can pre-fill their company details.
 *
 * @example
 * ```ts
 * const footer = { ...DEFAULT_FOOTER, companyName: 'Acme Inc.' }
 * ```
 */
export const DEFAULT_FOOTER: Omit<FooterBlock, 'id' | 'type'> = {
  reason: 'You are receiving this email because you signed up for updates from us.',
  companyName: 'Acme Inc.',
  address: '123 Market Street\nSan Francisco, CA 94103',
  unsubscribeLabel: 'Unsubscribe',
  unsubscribeUrl: '{{unsubscribeUrl}}',
  showPreferences: true,
  preferencesLabel: 'Email preferences',
  preferencesUrl: '{{preferencesUrl}}',
  align: 'center',
}

/**
 * Creates a new block with sensible defaults and a fresh id.
 *
 * @param type - The block type to create.
 * @returns A fully populated block.
 *
 * @example
 * ```ts
 * const button = createBlock('button')
 * ```
 */
export function createBlock(type: 'columns'): ColumnsBlock
export function createBlock(type: Exclude<BlockType, 'columns'>): LeafBlock
export function createBlock(type: BlockType): NewsletterBlock
export function createBlock(type: BlockType): NewsletterBlock {
  const id = createId('blk')
  switch (type) {
    case 'header':
      return { id, type, text: 'Your headline here', level: 1, align: 'left' }
    case 'text':
      return {
        id,
        type,
        html: 'Write something helpful for {{firstName}}. Select text to make it <b>bold</b> or add a link.',
        align: 'left',
        fontSize: 16,
      }
    case 'image':
      return { id, type, src: PLACEHOLDER_IMAGE, alt: '', widthPercent: 100, align: 'center', href: '' }
    case 'button':
      return { id, type, label: 'Read more', href: 'https://example.com', align: 'left', fullWidth: false, borderRadius: 6 }
    case 'divider':
      return { id, type, thickness: 1, style: 'solid', widthPercent: 100 }
    case 'spacer':
      return { id, type, height: 24 }
    case 'footer':
      return { id, type, ...DEFAULT_FOOTER }
    case 'columns': {
      const columns: ColumnData[] = [0, 1].map(() => ({
        id: createId('col'),
        widthPercent: 50,
        blocks: [{ ...(createBlock('header') as LeafBlock), text: 'Column heading', level: 3 } as LeafBlock],
      }))
      return { id, type, columns, gap: 24, stackOnMobile: true }
    }
  }
}

/**
 * Creates a column row with an equal split.
 *
 * @param count - Number of cells (2-4).
 * @returns A {@link ColumnsBlock} whose cells each contain one text block.
 *
 * @example
 * ```ts
 * const row = createColumns(3)
 * ```
 */
export function createColumns(count: 2 | 3 | 4): ColumnsBlock {
  const widthPercent = Math.floor(100 / count)
  const columns: ColumnData[] = Array.from({ length: count }, (_, index) => ({
    id: createId('col'),
    widthPercent: index === count - 1 ? 100 - widthPercent * (count - 1) : widthPercent,
    blocks: [createBlock('text')],
  }))
  return { id: createId('blk'), type: 'columns', columns, gap: 24, stackOnMobile: true }
}

/**
 * An empty document that only contains the compliance footer.
 *
 * @returns A new {@link NewsletterDocument}.
 *
 * @example
 * ```ts
 * const doc = createBlankDocument()
 * ```
 */
export function createBlankDocument(): NewsletterDocument {
  return {
    version: 1,
    subject: 'Your subject line',
    preheader: '',
    theme: DEFAULT_THEME,
    blocks: [],
  }
}

/**
 * A complete welcome email that uses headings, rich text, a button, a divider,
 * two columns, merge tags and the compliance footer.
 *
 * @returns A new {@link NewsletterDocument} with static ids, safe for server rendering.
 *
 * @example
 * ```ts
 * const { html } = compileNewsletter(createWelcomeTemplate(), { variables: { firstName: 'Ada' } })
 * ```
 */
export function createWelcomeTemplate(): NewsletterDocument {
  const image: ImageBlock = {
    id: 'welcome-image',
    type: 'image',
    src: PLACEHOLDER_IMAGE,
    alt: 'Welcome illustration',
    widthPercent: 100,
    align: 'center',
    href: '',
  }
  return {
    version: 1,
    subject: 'Welcome aboard, {{firstName}}',
    preheader: 'Here is everything you need for your first week.',
    theme: DEFAULT_THEME,
    blocks: [
      { id: 'welcome-h1', type: 'header', text: 'Welcome aboard, {{firstName}}', level: 1, align: 'left' },
      image,
      {
        id: 'welcome-text',
        type: 'text',
        html: 'Thanks for joining {{company}}. Over the next week we will send a few short emails that show you how to get set up, plus <a href="https://example.com/docs">links to the docs</a> you will actually use.',
        align: 'left',
        fontSize: 16,
      },
      { id: 'welcome-button', type: 'button', label: 'Get started', href: 'https://example.com/start', align: 'left', fullWidth: false, borderRadius: 6 },
      { id: 'welcome-divider', type: 'divider', thickness: 1, style: 'solid', widthPercent: 100 },
      {
        id: 'welcome-columns',
        type: 'columns',
        gap: 24,
        stackOnMobile: true,
        columns: [
          {
            id: 'welcome-col-a',
            widthPercent: 50,
            blocks: [
              { id: 'welcome-col-a-h', type: 'header', text: 'Build faster', level: 3, align: 'left' },
              { id: 'welcome-col-a-t', type: 'text', html: 'Start from a template and edit it visually. No lock-in, ever.', align: 'left', fontSize: 15 },
            ],
          },
          {
            id: 'welcome-col-b',
            widthPercent: 50,
            blocks: [
              { id: 'welcome-col-b-h', type: 'header', text: 'Send anywhere', level: 3, align: 'left' },
              { id: 'welcome-col-b-t', type: 'text', html: 'Hand the HTML to any SMTP provider or marketing platform.', align: 'left', fontSize: 15 },
            ],
          },
        ],
      },
      { id: 'welcome-spacer', type: 'spacer', height: 16 },
      { id: 'welcome-footer', type: 'footer', ...DEFAULT_FOOTER },
    ],
  }
}

/**
 * A short product-update layout: headline, intro, three feature columns and a button.
 *
 * @returns A new {@link NewsletterDocument} with static ids.
 *
 * @example
 * ```ts
 * const doc = createProductUpdateTemplate()
 * ```
 */
export function createProductUpdateTemplate(): NewsletterDocument {
  const feature = (key: string, title: string, body: string): ColumnData => ({
    id: `update-col-${key}`,
    widthPercent: key === 'c' ? 34 : 33,
    blocks: [
      { id: `update-${key}-h`, type: 'header', text: title, level: 3, align: 'left' },
      { id: `update-${key}-t`, type: 'text', html: body, align: 'left', fontSize: 14 },
    ],
  })
  return {
    version: 1,
    subject: "What's new this month, {{firstName}}",
    preheader: 'Three updates worth a minute of your time.',
    theme: DEFAULT_THEME,
    blocks: [
      { id: 'update-h1', type: 'header', text: 'Product update', level: 1, align: 'left' },
      {
        id: 'update-intro',
        type: 'text',
        html: 'Hi {{firstName}}, here is what shipped for {{company}} this month.',
        align: 'left',
        fontSize: 16,
      },
      {
        id: 'update-columns',
        type: 'columns',
        gap: 20,
        stackOnMobile: true,
        columns: [
          feature('a', 'Faster exports', 'HTML compiles in milliseconds, even for long issues.'),
          feature('b', 'Dark mode', 'Every send now adapts to the reader&#39;s colour scheme.'),
          feature('c', 'Merge tags', 'Personalise with {{firstName}} and friends.'),
        ],
      },
      { id: 'update-button', type: 'button', label: 'See the changelog', href: 'https://example.com/changelog', align: 'center', fullWidth: false, borderRadius: 6 },
      { id: 'update-footer', type: 'footer', ...DEFAULT_FOOTER },
    ],
  }
}
