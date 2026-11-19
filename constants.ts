import type { MergeTagDefinition, NewsletterTheme } from './types'

/**
 * Email-safe font stacks. Every stack ends in a generic family so clients that
 * lack the named fonts still render something sensible.
 *
 * @remarks
 * Web fonts are deliberately not offered: Gmail, Outlook desktop and several
 * other clients ignore `@font-face`, so a fallback stack is what most readers
 * actually see.
 *
 * @example
 * ```ts
 * FONT_STACKS.georgia.stack // "Georgia, 'Times New Roman', Times, serif"
 * ```
 */
export const FONT_STACKS = {
  system: {
    label: 'System UI',
    stack:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  helvetica: { label: 'Helvetica / Arial', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  verdana: { label: 'Verdana', stack: 'Verdana, Geneva, Tahoma, sans-serif' },
  trebuchet: { label: 'Trebuchet MS', stack: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif" },
  tahoma: { label: 'Tahoma', stack: 'Tahoma, Geneva, Verdana, sans-serif' },
  georgia: { label: 'Georgia', stack: "Georgia, 'Times New Roman', Times, serif" },
  palatino: { label: 'Palatino', stack: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
  times: { label: 'Times New Roman', stack: "'Times New Roman', Times, Georgia, serif" },
  courier: { label: 'Courier New', stack: "'Courier New', Courier, monospace" },
} as const satisfies Record<string, { label: string; stack: string }>

/** Identifier of an entry in {@link FONT_STACKS}. */
export type FontStackId = keyof typeof FONT_STACKS

/**
 * Resolves a font stack id to its CSS `font-family` value.
 *
 * @param id - A key of {@link FONT_STACKS}. Unknown ids fall back to `system`.
 * @returns A CSS `font-family` value that is safe to place in a single-quoted-free style attribute.
 *
 * @example
 * ```ts
 * getFontStack('georgia') // "Georgia, 'Times New Roman', Times, serif"
 * ```
 */
export function getFontStack(id: string): string {
  const entry = (FONT_STACKS as Record<string, { stack: string }>)[id]
  return entry ? entry.stack : FONT_STACKS.system.stack
}

/**
 * The default theme: a cobalt-on-paper light scheme with a matching dark scheme.
 *
 * @remarks
 * Treat as read-only. Use {@link createTheme} to derive a customised copy.
 */
export const DEFAULT_THEME: NewsletterTheme = {
  fontStack: 'helvetica',
  headingFontStack: 'helvetica',
  contentWidth: 600,
  baseFontSize: 16,
  containerRadius: 8,
  light: {
    pageBackground: '#f1f3f7',
    contentBackground: '#ffffff',
    text: '#2b3452',
    mutedText: '#6b7592',
    heading: '#0f1a33',
    link: '#2447e0',
    buttonBackground: '#2447e0',
    buttonText: '#ffffff',
    divider: '#dde1ea',
  },
  dark: {
    pageBackground: '#0b1020',
    contentBackground: '#141b30',
    text: '#d5daea',
    mutedText: '#8e98b8',
    heading: '#ffffff',
    link: '#8fa6ff',
    buttonBackground: '#8fa6ff',
    buttonText: '#0b1020',
    divider: '#2a3350',
  },
}

/**
 * Creates a theme by shallow-merging overrides onto {@link DEFAULT_THEME}.
 *
 * @param overrides - Partial theme. `light` and `dark` are merged key by key.
 * @returns A new, fully populated {@link NewsletterTheme}.
 *
 * @example
 * ```ts
 * const theme = createTheme({ fontStack: 'georgia', light: { link: '#b4232a' } })
 * ```
 */
export function createTheme(
  overrides: Partial<Omit<NewsletterTheme, 'light' | 'dark'>> & {
    light?: Partial<NewsletterTheme['light']>
    dark?: Partial<NewsletterTheme['dark']>
  } = {},
): NewsletterTheme {
  const { light, dark, ...rest } = overrides
  return {
    ...DEFAULT_THEME,
    ...rest,
    light: { ...DEFAULT_THEME.light, ...light },
    dark: { ...DEFAULT_THEME.dark, ...dark },
  }
}

/**
 * Merge tags offered in the editor menus by default.
 *
 * @remarks
 * These are suggestions only. Any `{{name}}` you type is compiled; pass your
 * own list through the `mergeTags` prop of the builder to customise menus.
 */
export const DEFAULT_MERGE_TAGS: MergeTagDefinition[] = [
  { name: 'firstName', label: 'First name', example: 'Ada' },
  { name: 'lastName', label: 'Last name', example: 'Lovelace' },
  { name: 'company', label: 'Company', example: 'Analytical Engines Ltd' },
  { name: 'email', label: 'Email address', example: 'ada@example.com' },
  { name: 'unsubscribeUrl', label: 'Unsubscribe URL', example: 'https://example.com/unsubscribe/abc123' },
  { name: 'preferencesUrl', label: 'Preferences URL', example: 'https://example.com/preferences/abc123' },
  { name: 'viewInBrowserUrl', label: 'View in browser URL', example: 'https://example.com/view/abc123' },
]

/**
 * Sample data derived from {@link DEFAULT_MERGE_TAGS}, ready to pass as
 * `previewData`.
 *
 * @example
 * ```tsx
 * <NewsletterRenderer document={doc} previewData={DEFAULT_PREVIEW_DATA} />
 * ```
 */
export const DEFAULT_PREVIEW_DATA: Record<string, string> = Object.fromEntries(
  DEFAULT_MERGE_TAGS.map((tag) => [tag.name, tag.example]),
)
