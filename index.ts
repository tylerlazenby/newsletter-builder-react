/**
 * newsletter-builder-react - a free, provider-agnostic visual email builder
 * and email-safe HTML compiler for React.
 *
 * @remarks
 * Import `newsletter-builder-react/styles.css` once. For the development-only
 * SMTP helper import from `newsletter-builder-react/node` on the server.
 *
 * @packageDocumentation
 */

export { NewsletterBuilder } from './components/NewsletterBuilder'
export type { NewsletterBuilderProps, BuilderView, ExportAction } from './components/NewsletterBuilder'
export { NewsletterRenderer } from './components/NewsletterRenderer'
export type { NewsletterRendererProps } from './components/NewsletterRenderer'

export { useNewsletterEditor, editorReducer, createEditorState } from './editor-state'
export type { NewsletterEditorApi, EditorState, EditorAction } from './editor-state'

export { compileNewsletter } from './compiler'
export { renderPlainText, richTextToPlain } from './plain-text'
export { lintNewsletter, GMAIL_CLIP_LIMIT_BYTES } from './lint'
export { applyMergeTags, extractMergeTags, escapeHtml } from './merge-tags'
export type { ApplyMergeTagsOptions } from './merge-tags'
export { sanitizeRichText, sanitizeUrl } from './sanitize'
export type { SanitizeUrlOptions } from './sanitize'

export { createBlock, createColumns, createBlankDocument, createWelcomeTemplate, createProductUpdateTemplate, DEFAULT_FOOTER, PLACEHOLDER_IMAGE } from './templates'
export { createId, findBlock, insertBlock, removeBlock, updateBlock, moveBlock, cloneBlock } from './tree'
export { DEFAULT_THEME, DEFAULT_MERGE_TAGS, DEFAULT_PREVIEW_DATA, FONT_STACKS, createTheme, getFontStack } from './constants'
export type { FontStackId } from './constants'

export type {
  BlockType,
  TextAlign,
  BaseBlock,
  HeaderBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  FooterBlock,
  LeafBlock,
  ColumnData,
  ColumnsBlock,
  NewsletterBlock,
  ThemeColors,
  NewsletterTheme,
  NewsletterDocument,
  ColorMode,
  CompileOptions,
  CompiledEmail,
  MergeTagDefinition,
  LintSeverity,
  LintIssue,
  BlockLocation,
} from './types'
