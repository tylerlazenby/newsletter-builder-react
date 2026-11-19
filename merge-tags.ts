/**
 * Escapes the five characters that are significant in HTML text and attribute
 * values.
 *
 * @param value - Untrusted text.
 * @returns A string that is safe to place inside an HTML text node or a quoted attribute.
 *
 * @example
 * ```ts
 * escapeHtml('Tom & "Jerry"') // 'Tom &amp; &quot;Jerry&quot;'
 * ```
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Creates a fresh regular expression that matches `{{tagName}}`.
 *
 * @returns A global regex whose first capture group is the tag name.
 *
 * @remarks
 * A new instance is returned each call so callers never share `lastIndex` state.
 * Tag names start with a letter or underscore and may contain letters, digits,
 * `_` and `.`.
 */
export function createMergeTagPattern(): RegExp {
  return /\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g
}

/**
 * Lists the unique merge tag names used in a string, in order of appearance.
 *
 * @param input - Any string, including HTML.
 * @returns Unique tag names without braces.
 *
 * @example
 * ```ts
 * extractMergeTags('Hi {{firstName}} from {{ company }} {{firstName}}')
 * // ['firstName', 'company']
 * ```
 */
export function extractMergeTags(input: string): string[] {
  const names = new Set<string>()
  for (const match of input.matchAll(createMergeTagPattern())) {
    names.add(match[1])
  }
  return Array.from(names)
}

/**
 * Options for {@link applyMergeTags}.
 */
export interface ApplyMergeTagsOptions {
  /**
   * Escape substituted values with {@link escapeHtml}. Enable when `input` is
   * HTML; disable for plain text and subject lines.
   *
   * @defaultValue false
   */
  escapeValues?: boolean
}

/**
 * Replaces `{{tag}}` placeholders with values.
 *
 * @param input - Text or HTML containing merge tags.
 * @param data - Map of tag name to value.
 * @param options - See {@link ApplyMergeTagsOptions}.
 * @returns The input with known tags substituted. Unknown tags are left intact.
 *
 * @remarks
 * Leaving unknown tags untouched is intentional: it lets you resolve some
 * variables in your app and hand the rest to the sending platform.
 * Tag names are matched case-sensitively and only own properties of `data` are
 * considered, so `{{constructor}}` can never leak prototype members.
 *
 * @example
 * ```ts
 * applyMergeTags('Hi {{firstName}} {{lastName}}', { firstName: 'Ada' })
 * // 'Hi Ada {{lastName}}'
 * ```
 */
export function applyMergeTags(
  input: string,
  data: Record<string, string> | undefined,
  options: ApplyMergeTagsOptions = {},
): string {
  if (!data) return input
  return input.replace(createMergeTagPattern(), (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(data, name)) return match
    const value = String(data[name])
    return options.escapeValues ? escapeHtml(value) : value
  })
}
