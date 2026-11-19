'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { MergeTagDefinition } from '../types'

/** Shared props for labelled fields. @internal */
interface FieldChrome {
  label: string
  hint?: string
  /** Rendered to the right of the label, e.g. a merge-tag menu. */
  action?: ReactNode
}

function FieldShell({ id, label, hint, action, children }: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className="nb-field">
      <div className="nb-field-head">
        <label htmlFor={id} className="nb-label">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint ? <p className="nb-hint">{hint}</p> : null}
    </div>
  )
}

/**
 * Single-line text input with a label.
 *
 * @param props - Label, value and change handler. `type` defaults to `text`.
 * @returns A labelled input.
 * @internal
 */
export function TextField(props: FieldChrome & {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'url' | 'email'
  placeholder?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} {...props}>
      <input
        id={id}
        className="nb-input"
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </FieldShell>
  )
}

/**
 * Multi-line text area with a label.
 *
 * @param props - Label, value and change handler.
 * @returns A labelled textarea.
 * @internal
 */
export function TextAreaField(props: FieldChrome & { value: string; onChange: (value: string) => void; rows?: number }) {
  const id = useId()
  return (
    <FieldShell id={id} {...props}>
      <textarea
        id={id}
        className="nb-input nb-textarea"
        rows={props.rows ?? 3}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </FieldShell>
  )
}

/**
 * Select input with a label.
 *
 * @param props - Label, options, value and change handler.
 * @returns A labelled select.
 * @internal
 */
export function SelectField<T extends string | number>(
  props: FieldChrome & { value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void },
) {
  const id = useId()
  return (
    <FieldShell id={id} {...props}>
      <select
        id={id}
        className="nb-input"
        value={String(props.value)}
        onChange={(event) => {
          const match = props.options.find((option) => String(option.value) === event.target.value)
          if (match) props.onChange(match.value)
        }}
      >
        {props.options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

/**
 * Range slider with a numeric read-out.
 *
 * @param props - Label, bounds, value and change handler.
 * @returns A labelled slider.
 * @internal
 */
export function RangeField(props: FieldChrome & {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <FieldShell id={id} {...props} action={<output className="nb-range-value">{props.value}{props.unit ?? ''}</output>}>
      <input
        id={id}
        className="nb-range"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </FieldShell>
  )
}

/**
 * Colour picker paired with a hex text input.
 *
 * @param props - Label, value and change handler. Invalid hex input is ignored until valid.
 * @returns A labelled colour field.
 * @internal
 */
export function ColorField(props: FieldChrome & { value: string; onChange: (value: string) => void; onClear?: () => void }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const safe = /^#[0-9a-f]{6}$/i.test(props.value) ? props.value : '#000000'
  return (
    <FieldShell id={id} {...props}>
      <div className="nb-color-row">
        <input
          type="color"
          className="nb-color"
          aria-label={`${props.label} colour picker`}
          value={safe}
          onChange={(event) => {
            setDraft(null)
            props.onChange(event.target.value)
          }}
        />
        <input
          id={id}
          className="nb-input nb-mono"
          value={draft ?? props.value}
          maxLength={7}
          spellCheck={false}
          aria-invalid={draft !== null && !/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(draft)}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            const next = event.target.value
            if (!/^#[0-9a-f]{0,6}$/i.test(next)) return
            setDraft(next)
            if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(next)) props.onChange(next)
          }}
        />
        {props.onClear ? (
          <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm" onClick={props.onClear}>
            Reset
          </button>
        ) : null}
      </div>
    </FieldShell>
  )
}

/**
 * Segmented control for a small set of mutually exclusive options.
 *
 * @param props - Label, options, value and change handler.
 * @returns A radio-group styled as a segmented control.
 * @internal
 */
export function SegmentedField<T extends string | number>(
  props: FieldChrome & { value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void },
) {
  const id = useId()
  return (
    <div className="nb-field">
      <div className="nb-field-head">
        <span id={id} className="nb-label">
          {props.label}
        </span>
        {props.action}
      </div>
      <div className="nb-segmented" role="radiogroup" aria-labelledby={id}>
        {props.options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === props.value}
            className="nb-segment"
            data-active={option.value === props.value}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {props.hint ? <p className="nb-hint">{props.hint}</p> : null}
    </div>
  )
}

/**
 * Switch for a boolean option.
 *
 * @param props - Label, value and change handler.
 * @returns A labelled switch.
 * @internal
 */
export function ToggleField(props: FieldChrome & { value: boolean; onChange: (value: boolean) => void }) {
  const id = useId()
  return (
    <div className="nb-field nb-toggle-field">
      <label htmlFor={id} className="nb-label">
        {props.label}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="nb-switch"
        checked={props.value}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.hint ? <p className="nb-hint nb-toggle-hint">{props.hint}</p> : null}
    </div>
  )
}

/**
 * A compact menu that lets people insert a merge tag.
 *
 * @param props - Available tags and a pick handler that receives the tag **with** braces.
 * @returns A small select that resets after each choice.
 * @internal
 */
export function MergeTagMenu({ tags, onPick, label = 'Insert variable' }: {
  tags: MergeTagDefinition[]
  onPick: (tag: string) => void
  label?: string
}) {
  return (
    <select
      className="nb-tag-menu"
      aria-label={label}
      value=""
      onChange={(event) => {
        if (event.target.value) onPick(`{{${event.target.value}}}`)
      }}
    >
      <option value="">{'{{ }}'} Variable</option>
      {tags.map((tag) => (
        <option key={tag.name} value={tag.name}>
          {tag.label}
        </option>
      ))}
    </select>
  )
}
