'use client'

import type { LintIssue } from '../types'
import { Icon } from './icons'

/**
 * Props for {@link CodeView}.
 *
 * @internal
 */
export interface CodeViewProps {
  title: string
  code: string
  /** Called when the copy button is pressed. */
  onCopy: () => void
  issues?: LintIssue[]
}

/**
 * Read-only, copyable view of compiled output with optional lint results.
 *
 * @param props - See {@link CodeViewProps}.
 * @returns A code panel.
 * @internal
 */
export function CodeView({ title, code, onCopy, issues }: CodeViewProps) {
  const bytes = new TextEncoder().encode(code).length
  return (
    <section className="nb-code" aria-label={title}>
      <header className="nb-code-head">
        <h2 className="nb-panel-title">{title}</h2>
        <span className="nb-code-size">{(bytes / 1024).toFixed(1)} KB</span>
        <button type="button" className="nb-btn nb-btn-sm" onClick={onCopy}>
          <Icon name="copy" /> Copy
        </button>
      </header>
      {issues ? (
        <ul className="nb-lint" aria-label="Checks">
          {issues.length === 0 ? (
            <li className="nb-lint-item" data-severity="ok">
              <Icon name="check" /> No issues found.
            </li>
          ) : (
            issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="nb-lint-item" data-severity={issue.severity}>
                <Icon name={issue.severity === 'info' ? 'info' : 'warning'} />
                <span>{issue.message}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <pre className="nb-pre" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </section>
  )
}
