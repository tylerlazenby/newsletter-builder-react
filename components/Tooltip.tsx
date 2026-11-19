'use client'

import { cloneElement, useId } from 'react'
import type { ReactElement } from 'react'

/**
 * Props for {@link Tooltip}.
 *
 * @internal
 */
export interface TooltipProps {
  /** Tooltip text. */
  label: string
  /** The single interactive element the tooltip describes. */
  children: ReactElement<{ 'aria-describedby'?: string }>
  /** Preferred side. @defaultValue 'top' */
  side?: 'top' | 'bottom'
}

/**
 * A CSS-driven tooltip that appears on hover **and** keyboard focus and is
 * wired to its trigger with `aria-describedby`.
 *
 * @param props - See {@link TooltipProps}.
 * @returns The trigger wrapped with a tooltip bubble.
 *
 * @example
 * ```tsx
 * <Tooltip label="Duplicate block"><button>Copy</button></Tooltip>
 * ```
 *
 * @internal
 */
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const id = useId()
  return (
    <span className="nb-tip" data-side={side}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span role="tooltip" id={id} className="nb-tip-bubble">
        {label}
      </span>
    </span>
  )
}
