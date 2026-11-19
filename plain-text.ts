import type { LeafBlock, NewsletterBlock, NewsletterDocument } from './types'

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Decodes the HTML entities the compiler can emit.
 *
 * @param value - A string containing named or numeric entities.
 * @returns The decoded string.
 *
 * @example
 * ```ts
 * decodeEntities('Tom &amp; Jerry &#39;s') // "Tom & Jerry 's"
 * ```
 */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

function readLinkHref(openingTag: string): string | undefined {
  const lowerTag = openingTag.toLowerCase()
  let searchFrom = 2

  while (searchFrom < openingTag.length) {
    const hrefIndex = lowerTag.indexOf('href', searchFrom)
    if (hrefIndex === -1) return undefined

    searchFrom = hrefIndex + 4
    const before = lowerTag[hrefIndex - 1]
    if (before !== undefined && !/\s/.test(before)) continue

    let valueIndex = hrefIndex + 4
    while (/\s/.test(openingTag[valueIndex] ?? '')) valueIndex++
    if (openingTag[valueIndex] !== '=') continue

    valueIndex++
    while (/\s/.test(openingTag[valueIndex] ?? '')) valueIndex++
    const quote = openingTag[valueIndex]
    if (quote !== '"' && quote !== "'") continue

    const valueEnd = openingTag.indexOf(quote, valueIndex + 1)
    if (valueEnd === -1) return undefined
    return openingTag.slice(valueIndex + 1, valueEnd)
  }

  return undefined
}

/**
 * Converts the inline HTML subset used by text blocks into plain text.
 *
 * @param html - Sanitised rich text.
 * @returns Plain text. Links become `label (url)` and `<br>` becomes a newline.
 *
 * @example
 * ```ts
 * richTextToPlain('Read <a href="https://x.dev">the docs</a><br>Thanks')
 * // 'Read the docs (https://x.dev)\nThanks'
 * ```
 */
export function richTextToPlain(html: string): string {
  const lowerHtml = html.toLowerCase()
  let cursor = 0
  let withLinks = ''

  while (cursor < html.length) {
    const start = lowerHtml.indexOf('<a', cursor)
    if (start === -1) {
      withLinks += html.slice(cursor)
      break
    }

    const following = lowerHtml[start + 2]
    if (following !== undefined && !/\s/.test(following) && following !== '>') {
      withLinks += html.slice(cursor, start + 2)
      cursor = start + 2
      continue
    }

    const openingEnd = html.indexOf('>', start + 2)
    if (openingEnd === -1) {
      withLinks += html.slice(cursor)
      break
    }

    const closingStart = lowerHtml.indexOf('</a>', openingEnd + 1)
    if (closingStart === -1) {
      withLinks += html.slice(cursor)
      break
    }

    const href = readLinkHref(html.slice(start, openingEnd + 1))
    withLinks += html.slice(cursor, start)
    if (href === undefined) {
      withLinks += html.slice(start, openingEnd + 1)
      withLinks += html.slice(openingEnd + 1, closingStart)
    } else {
      const label = html.slice(openingEnd + 1, closingStart)
      const url = decodeEntities(href)
      const text = decodeEntities(label.replace(/<[^>]+>/g, ''))
      withLinks += text.trim() === url ? url : `${text} (${url})`
    }
    cursor = closingStart + 4
  }

  return decodeEntities(withLinks.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
}

function leafToPlain(block: LeafBlock): string {
  switch (block.type) {
    case 'header':
      return block.level === 1 ? block.text.toUpperCase() : block.text
    case 'text':
      return richTextToPlain(block.html)
    case 'image':
      return block.alt || block.href ? `[${block.alt || 'Image'}]${block.href ? ` ${block.href}` : ''}` : ''
    case 'button':
      return `${block.label}: ${block.href}`
    case 'divider':
      return '----------------------------------------'
    case 'spacer':
      return ''
    case 'footer':
      return [
        block.reason,
        [block.companyName, block.address].filter(Boolean).join('\n'),
        `${block.unsubscribeLabel}: ${block.unsubscribeUrl}`,
        block.showPreferences ? `${block.preferencesLabel}: ${block.preferencesUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
  }
}

function blockToPlain(block: NewsletterBlock): string {
  if (block.type === 'columns') {
    return block.columns
      .flatMap((column) => column.blocks.map(leafToPlain))
      .filter(Boolean)
      .join('\n\n')
  }
  return leafToPlain(block)
}

/**
 * Generates the plain-text alternative for a document.
 *
 * @param document - The newsletter document.
 * @returns Plain text with blocks separated by blank lines. Merge tags are left
 * in place - resolve them with {@link applyMergeTags}.
 *
 * @remarks
 * Sending a `text/plain` part alongside HTML improves deliverability and is
 * what screen readers and some corporate gateways fall back to.
 *
 * @example
 * ```ts
 * const text = renderPlainText(createWelcomeTemplate())
 * ```
 */
export function renderPlainText(document: NewsletterDocument): string {
  return (
    document.blocks
      .map(blockToPlain)
      .filter((part) => part.trim().length > 0)
      .join('\n\n')
      .trim() + '\n'
  )
}
