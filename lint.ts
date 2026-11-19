import type { LeafBlock, LintIssue, NewsletterBlock, NewsletterDocument } from './types'

/**
 * Gmail clips messages larger than roughly 102 KB, hiding your footer and
 * unsubscribe link behind a "View entire message" link.
 */
export const GMAIL_CLIP_LIMIT_BYTES = 102 * 1024

function* leaves(blocks: NewsletterBlock[]): Generator<LeafBlock> {
  for (const block of blocks) {
    if (block.type === 'columns') {
      for (const column of block.columns) yield* column.blocks
    } else {
      yield block
    }
  }
}

/**
 * Checks a document for common deliverability and accessibility problems.
 *
 * @param document - The document to inspect.
 * @param html - Optional compiled HTML. When supplied, its size is checked against Gmail's clipping limit.
 * @returns A list of {@link LintIssue}s, most severe first. Empty when nothing was found.
 *
 * @remarks
 * Checks: missing subject, missing preheader, missing unsubscribe footer,
 * images without alt text, `data:` image URLs (blocked by Gmail and Outlook),
 * site-relative image URLs, empty button links and Gmail's 102 KB clipping limit.
 * It never throws and never modifies the document.
 *
 * @example
 * ```ts
 * const issues = lintNewsletter(doc, compileNewsletter(doc).html)
 * issues.filter((issue) => issue.severity === 'error')
 * ```
 */
export function lintNewsletter(document: NewsletterDocument, html?: string): LintIssue[] {
  const issues: LintIssue[] = []

  if (!document.subject.trim()) {
    issues.push({ severity: 'error', code: 'subject-empty', message: 'The subject line is empty.' })
  }
  if (!document.preheader.trim()) {
    issues.push({
      severity: 'info',
      code: 'preheader-empty',
      message: 'Add a preheader so inboxes show useful preview text instead of the first line of the body.',
    })
  }

  let hasFooter = false
  for (const block of leaves(document.blocks)) {
    if (block.type === 'footer') {
      hasFooter = true
      if (!block.unsubscribeUrl.trim()) {
        issues.push({
          severity: 'error',
          code: 'unsubscribe-url-empty',
          message: 'The footer has no unsubscribe URL.',
          blockId: block.id,
        })
      }
      if (!block.address.trim()) {
        issues.push({
          severity: 'warning',
          code: 'footer-address-empty',
          message: 'Marketing email generally needs a physical sender address (CAN-SPAM, CASL).',
          blockId: block.id,
        })
      }
    }
    if (block.type === 'image') {
      if (!block.src.trim()) {
        issues.push({ severity: 'warning', code: 'image-empty', message: 'An image block has no image.', blockId: block.id })
      } else if (/^data:/i.test(block.src)) {
        issues.push({
          severity: 'warning',
          code: 'image-data-url',
          message: 'Data-URL images are blocked by Gmail and Outlook. Host the image and use an https:// URL.',
          blockId: block.id,
        })
      } else if (block.src.startsWith('/')) {
        issues.push({
          severity: 'warning',
          code: 'image-relative-url',
          message: 'Relative image URLs will not load in a mail client. Use an absolute https:// URL.',
          blockId: block.id,
        })
      }
      if (!block.alt.trim()) {
        issues.push({
          severity: 'warning',
          code: 'image-missing-alt',
          message: 'Image is missing alt text. Many clients block images by default.',
          blockId: block.id,
        })
      }
    }
    if (block.type === 'button' && !block.href.trim()) {
      issues.push({ severity: 'error', code: 'button-no-link', message: `Button "${block.label}" has no link.`, blockId: block.id })
    }
  }

  if (!hasFooter) {
    issues.push({
      severity: 'warning',
      code: 'footer-missing',
      message: 'No unsubscribe and compliance footer. Add one before sending marketing email.',
    })
  }

  if (html) {
    const bytes = new TextEncoder().encode(html).length
    if (bytes > GMAIL_CLIP_LIMIT_BYTES) {
      issues.push({
        severity: 'warning',
        code: 'gmail-clipping',
        message: `Compiled HTML is ${(bytes / 1024).toFixed(1)} KB. Gmail clips messages over 102 KB.`,
      })
    }
  }

  const order = { error: 0, warning: 1, info: 2 } as const
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}
