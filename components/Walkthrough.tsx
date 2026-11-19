'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icons'

const STEPS = [
  {
    title: 'Add blocks',
    body: 'Drag a block from the left onto the canvas, or click one to add it after the selected block. Columns hold other blocks.',
  },
  {
    title: 'Edit anything',
    body: 'Select a block to change its text, colours, links and spacing on the right. Use the Variable menus to insert tags like {{firstName}}.',
  },
  {
    title: 'Personalise',
    body: 'The Variables tab holds sample data. Turn on "Sample data" in the toolbar to preview the email for a real-looking customer.',
  },
  {
    title: 'Preview and export',
    body: 'Switch to Preview to test light and dark mode on desktop and mobile. When it looks right, copy the HTML or download it.',
  },
] as const

/**
 * Props for {@link Walkthrough}.
 *
 * @internal
 */
export interface WalkthroughProps {
  onDismiss: () => void
}

/**
 * A dismissible four-step quick-start card.
 *
 * @param props - See {@link WalkthroughProps}.
 * @returns A non-modal dialog anchored to the bottom-left of the builder.
 * @internal
 */
export function Walkthrough({ onDismiss }: WalkthroughProps) {
  const [step, setStep] = useState(0)
  const titleId = useId()
  const nextRef = useRef<HTMLButtonElement>(null)
  const last = step === STEPS.length - 1
  const current = STEPS[step]

  useEffect(() => {
    if (step > 0) nextRef.current?.focus()
  }, [step])

  return (
    <div
      className="nb-walkthrough"
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="false"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss()
      }}
    >
      <div className="nb-walkthrough-head">
        <span className="nb-walkthrough-step">
          Step {step + 1} of {STEPS.length}
        </span>
        <button type="button" className="nb-icon-btn" aria-label="Dismiss quick start" onClick={onDismiss}>
          <Icon name="close" />
        </button>
      </div>
      <h2 id={titleId} className="nb-walkthrough-title">
        {current.title}
      </h2>
      <p className="nb-walkthrough-body">{current.body}</p>
      <div className="nb-walkthrough-foot">
        <div className="nb-dots" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.title} className="nb-dot" data-active={index === step} />
          ))}
        </div>
        <div className="nb-walkthrough-actions">
          {step > 0 ? (
            <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm" onClick={onDismiss}>
              Skip
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            className="nb-btn nb-btn-primary nb-btn-sm"
            onClick={() => (last ? onDismiss() : setStep(step + 1))}
          >
            {last ? 'Start building' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
