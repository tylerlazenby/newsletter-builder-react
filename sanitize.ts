/**
 * Options for {@link sanitizeUrl}.
 */
export interface SanitizeUrlOptions {
  /**
   * Permit `data:image/*` URLs. Useful for local previews, but Gmail and
   * Outlook block them, so only enable for `src` attributes.
   *
   * @defaultValue false
   */
  allowDataImage?: boolean
}

/**
 * Validates a URL for use in an `href` or `src` attribute.
 *
 * @param url - Untrusted URL.
 * @param options - See {@link SanitizeUrlOptions}.
 * @returns The trimmed URL when its scheme is allowed, otherwise an empty string.
 *
 * @remarks
 * Allowed: `http:`, `https:`, `mailto:`, `tel:`, `cid:`, in-page `#` anchors,
 * site-relative paths and `{{mergeTag}}` placeholders. Everything else -
 * notably `javascript:` and `vbscript:` - is rejected, even when obfuscated
 * with whitespace or control characters.
 *
 * @example
 * ```ts
 * sanitizeUrl('https://example.com') // 'https://example.com'
 * sanitizeUrl('java\nscript:alert(1)') // ''
 * sanitizeUrl('{{unsubscribeUrl}}') // '{{unsubscribeUrl}}'
 * ```
 */
export function sanitizeUrl(url: string, options: SanitizeUrlOptions = {}): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  // eslint-disable-next-line no-control-regex
  const probe = trimmed.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').toLowerCase()
  if (/^(https?:|mailto:|tel:|cid:|#|\{\{)/.test(probe)) return trimmed
  if (/^\/(?!\/)/.test(probe)) return trimmed
  if (options.allowDataImage && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/.test(probe)) {
    return trimmed
  }
  return ''
}

const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<!--[\s\S]*?-->|[^<]+|</g

const TAG_ALIASES: Record<string, string> = { strong: 'b', em: 'i', b: 'b', i: 'i', u: 'u', a: 'a', br: 'br' }

function readHref(attributes: string): string {
  const match = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes)
  const raw = match ? (match[1] ?? match[2] ?? match[3] ?? '') : ''
  const decoded = raw.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
  return sanitizeUrl(decoded)
}

/**
 * Reduces arbitrary HTML to the small inline subset the compiler supports.
 *
 * @param html - HTML from a `contentEditable` element or a stored document.
 * @returns Safe HTML containing only `<b>`, `<i>`, `<u>`, `<a href>` and `<br>`.
 *
 * @remarks
 * - `strong`/`em` are normalised to `b`/`i`.
 * - Block elements (`div`, `p`, `li`) become line breaks.
 * - `script` and `style` elements are dropped together with their content.
 * - Links keep only a validated `href`; every other attribute is removed.
 * - Unclosed tags are closed so the output is always well-formed.
 * - The function is string based and never touches the DOM, so it runs on the
 *   server and in the browser alike.
 *
 * @example
 * ```ts
 * sanitizeRichText('<div>Hi <strong onclick="x()">Ada</strong></div><script>1</script>')
 * // 'Hi <b>Ada</b>'
 * ```
 */
export function sanitizeRichText(html: string): string {
  let source = html
  let previous: string
  do {
    previous = source
    source = source
      .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
  } while (source !== previous)
  const stack: string[] = []
  let out = ''

  const pushBreak = () => {
    if (out && !out.endsWith('<br>')) out += '<br>'
  }

  for (const match of source.matchAll(TAG_PATTERN)) {
    const token = match[0]
    const closing = match[1] === '/'
    const rawName = match[2]?.toLowerCase()

    if (!rawName) {
      out += token === '<' ? '&lt;' : token.replace(/>/g, '&gt;')
      continue
    }

    if (rawName === 'div' || rawName === 'p' || rawName === 'li' || rawName === 'h1' || rawName === 'h2' || rawName === 'h3') {
      if (!closing) pushBreak()
      continue
    }

    const name = TAG_ALIASES[rawName]
    if (!name) continue

    if (name === 'br') {
      if (!closing) out += '<br>'
      continue
    }

    if (closing) {
      const index = stack.lastIndexOf(name)
      if (index === -1) continue
      while (stack.length > index) out += `</${stack.pop()}>`
      continue
    }

    if (name === 'a') {
      const href = readHref(match[3] ?? '')
      if (!href) continue
      stack.push('a')
      out += `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">`
      continue
    }

    stack.push(name)
    out += `<${name}>`
  }

  while (stack.length) out += `</${stack.pop()}>`
  return out.replace(/(<br>)+$/g, '')
}
