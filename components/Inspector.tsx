'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FONT_STACKS } from '../constants'
import type { FontStackId } from '../constants'
import { extractMergeTags } from '../merge-tags'
import { createId } from '../tree'
import type { ColumnData, ColumnsBlock, NewsletterBlock, ThemeColors, TextAlign } from '../types'
import { blockLabel, useBuilder } from './builder-context'
import {
  ColorField,
  MergeTagMenu,
  RangeField,
  SegmentedField,
  SelectField,
  TextAreaField,
  TextField,
  ToggleField,
} from './Fields'
import { Icon } from './icons'
import { RichTextEditor } from './RichTextEditor'

const ALIGN_OPTIONS: ReadonlyArray<{ value: TextAlign; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const COLUMN_PRESETS: Record<2 | 3 | 4, ReadonlyArray<{ label: string; widths: number[] }>> = {
  2: [
    { label: '50 / 50', widths: [50, 50] },
    { label: '33 / 67', widths: [33, 67] },
    { label: '67 / 33', widths: [67, 33] },
    { label: '25 / 75', widths: [25, 75] },
    { label: '75 / 25', widths: [75, 25] },
  ],
  3: [
    { label: '33 / 33 / 34', widths: [33, 33, 34] },
    { label: '25 / 50 / 25', widths: [25, 50, 25] },
    { label: '50 / 25 / 25', widths: [50, 25, 25] },
    { label: '25 / 25 / 50', widths: [25, 25, 50] },
  ],
  4: [{ label: '25 / 25 / 25 / 25', widths: [25, 25, 25, 25] }],
}

const COLOR_FIELDS: ReadonlyArray<{ key: keyof ThemeColors; label: string }> = [
  { key: 'pageBackground', label: 'Page background' },
  { key: 'contentBackground', label: 'Email background' },
  { key: 'text', label: 'Body text' },
  { key: 'mutedText', label: 'Muted text' },
  { key: 'heading', label: 'Headings' },
  { key: 'link', label: 'Links' },
  { key: 'buttonBackground', label: 'Button' },
  { key: 'buttonText', label: 'Button text' },
  { key: 'divider', label: 'Dividers' },
]

const FONT_OPTIONS = (Object.keys(FONT_STACKS) as FontStackId[]).map((id) => ({ value: id, label: FONT_STACKS[id].label }))

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function resizeColumns(block: ColumnsBlock, count: 2 | 3 | 4): ColumnData[] {
  const kept = block.columns.slice(0, count)
  const overflow = block.columns.slice(count).flatMap((column) => column.blocks)
  const columns = [...kept]
  while (columns.length < count) columns.push({ id: createId('col'), widthPercent: 25, blocks: [] })
  if (overflow.length) {
    const last = columns[columns.length - 1]
    columns[columns.length - 1] = { ...last, blocks: [...last.blocks, ...overflow] }
  }
  const widths = COLUMN_PRESETS[count][0].widths
  return columns.map((column, index) => ({ ...column, widthPercent: widths[index] }))
}

function BlockInspector({ block }: { block: NewsletterBlock }) {
  const { editor, mergeTags, onImageUpload } = useBuilder()
  const theme = editor.document.theme
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'busy' | 'error'>('idle')

  const set = (patch: Record<string, unknown>, field?: string) =>
    editor.updateBlock(block.id, patch, field ? `${block.id}:${field}` : undefined)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || block.type !== 'image') return
    setUploadState('busy')
    try {
      const src = onImageUpload ? await onImageUpload(file) : await readAsDataUrl(file)
      set({ src, alt: block.alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') })
      setUploadState('idle')
    } catch {
      setUploadState('error')
    }
  }

  switch (block.type) {
    case 'header':
      return (
        <>
          <TextField
            label="Text"
            value={block.text}
            onChange={(text) => set({ text }, 'text')}
            action={<MergeTagMenu tags={mergeTags} onPick={(tag) => set({ text: block.text + tag }, 'text')} />}
          />
          <SegmentedField label="Level" value={block.level} options={[{ value: 1, label: 'H1' }, { value: 2, label: 'H2' }, { value: 3, label: 'H3' }]} onChange={(level) => set({ level })} />
          <SegmentedField label="Alignment" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <ColorField
            label="Colour override"
            hint="Overrides the theme heading colour in light and dark mode."
            value={block.color ?? theme.light.heading}
            onChange={(color) => set({ color }, 'color')}
            onClear={block.color ? () => set({ color: undefined }) : undefined}
          />
        </>
      )
    case 'text':
      return (
        <>
          <RichTextEditor label="Content" value={block.html} onChange={(html) => set({ html }, 'html')} mergeTags={mergeTags} />
          <SegmentedField label="Alignment" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <RangeField label="Font size" value={block.fontSize} min={12} max={24} unit="px" onChange={(fontSize) => set({ fontSize }, 'fontSize')} />
        </>
      )
    case 'image':
      return (
        <>
          <TextField
            label="Image URL"
            type="url"
            value={block.src.startsWith('data:') ? '' : block.src}
            placeholder={block.src.startsWith('data:') ? 'Embedded preview image - paste an https:// URL' : 'https://'}
            hint="Use a hosted https:// URL. Gmail and Outlook block embedded images."
            onChange={(src) => set({ src }, 'src')}
          />
          <div className="nb-field">
            <input ref={fileInput} type="file" accept="image/*" className="nb-sr-only" aria-label="Upload image" onChange={onFile} />
            <button type="button" className="nb-btn nb-btn-block" onClick={() => fileInput.current?.click()} disabled={uploadState === 'busy'}>
              <Icon name="upload" /> {uploadState === 'busy' ? 'Uploading...' : 'Upload image'}
            </button>
            <p className="nb-hint">
              {onImageUpload
                ? 'Files are sent to your onImageUpload handler.'
                : 'No onImageUpload handler: uploads are embedded for preview only.'}
            </p>
            {uploadState === 'error' ? <p className="nb-error">Upload failed. Try again or paste a URL.</p> : null}
          </div>
          <TextField
            label="Alt text"
            value={block.alt}
            hint="Describe the image for people who cannot see it. Leave blank only for decorative images."
            onChange={(alt) => set({ alt }, 'alt')}
          />
          <RangeField label="Width" value={block.widthPercent} min={10} max={100} step={5} unit="%" onChange={(widthPercent) => set({ widthPercent }, 'width')} />
          <SegmentedField label="Alignment" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <TextField label="Link (optional)" type="url" value={block.href} onChange={(href) => set({ href }, 'href')} />
        </>
      )
    case 'button':
      return (
        <>
          <TextField
            label="Label"
            value={block.label}
            onChange={(label) => set({ label }, 'label')}
            action={<MergeTagMenu tags={mergeTags} onPick={(tag) => set({ label: block.label + tag }, 'label')} />}
          />
          <TextField
            label="Link URL"
            type="url"
            value={block.href}
            onChange={(href) => set({ href }, 'href')}
            action={<MergeTagMenu tags={mergeTags.filter((tag) => /url/i.test(tag.name))} onPick={(tag) => set({ href: tag }, 'href')} label="Use URL variable" />}
          />
          <SegmentedField label="Alignment" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
          <ToggleField label="Full width" value={block.fullWidth} onChange={(fullWidth) => set({ fullWidth })} />
          <RangeField label="Corner radius" value={block.borderRadius} min={0} max={30} unit="px" onChange={(borderRadius) => set({ borderRadius }, 'radius')} />
          <ColorField
            label="Background override"
            value={block.backgroundColor ?? theme.light.buttonBackground}
            onChange={(backgroundColor) => set({ backgroundColor }, 'bg')}
            onClear={block.backgroundColor ? () => set({ backgroundColor: undefined }) : undefined}
          />
          <ColorField
            label="Text override"
            value={block.textColor ?? theme.light.buttonText}
            onChange={(textColor) => set({ textColor }, 'fg')}
            onClear={block.textColor ? () => set({ textColor: undefined }) : undefined}
          />
        </>
      )
    case 'divider':
      return (
        <>
          <RangeField label="Thickness" value={block.thickness} min={1} max={8} unit="px" onChange={(thickness) => set({ thickness }, 'thickness')} />
          <SelectField label="Style" value={block.style} options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }]} onChange={(style) => set({ style })} />
          <RangeField label="Width" value={block.widthPercent} min={10} max={100} step={5} unit="%" onChange={(widthPercent) => set({ widthPercent }, 'width')} />
        </>
      )
    case 'spacer':
      return <RangeField label="Height" value={block.height} min={4} max={120} unit="px" onChange={(height) => set({ height }, 'height')} />
    case 'footer':
      return (
        <>
          <p className="nb-callout">
            <Icon name="info" /> Keep a working unsubscribe link and a postal address in marketing email.
          </p>
          <TextAreaField label="Reason for receiving" value={block.reason} onChange={(reason) => set({ reason }, 'reason')} />
          <TextField label="Company name" value={block.companyName} onChange={(companyName) => set({ companyName }, 'company')} />
          <TextAreaField label="Postal address" value={block.address} onChange={(address) => set({ address }, 'address')} />
          <TextField label="Unsubscribe label" value={block.unsubscribeLabel} onChange={(unsubscribeLabel) => set({ unsubscribeLabel }, 'unsubLabel')} />
          <TextField
            label="Unsubscribe URL"
            value={block.unsubscribeUrl}
            hint="Keep {{unsubscribeUrl}} so your sender fills a unique link per recipient."
            onChange={(unsubscribeUrl) => set({ unsubscribeUrl }, 'unsubUrl')}
          />
          <ToggleField label="Show preferences link" value={block.showPreferences} onChange={(showPreferences) => set({ showPreferences })} />
          {block.showPreferences ? (
            <>
              <TextField label="Preferences label" value={block.preferencesLabel} onChange={(preferencesLabel) => set({ preferencesLabel }, 'prefLabel')} />
              <TextField label="Preferences URL" value={block.preferencesUrl} onChange={(preferencesUrl) => set({ preferencesUrl }, 'prefUrl')} />
            </>
          ) : null}
          <SegmentedField label="Alignment" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => set({ align })} />
        </>
      )
    case 'columns': {
      const count = block.columns.length as 2 | 3 | 4
      return (
        <>
          <SegmentedField
            label="Columns"
            value={count}
            options={[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]}
            onChange={(next) => set({ columns: resizeColumns(block, next) })}
          />
          <SelectField
            label="Layout"
            value={block.columns.map((column) => column.widthPercent).join('/')}
            options={[
              ...COLUMN_PRESETS[count].map((preset) => ({ value: preset.widths.join('/'), label: preset.label })),
              ...(COLUMN_PRESETS[count].some((preset) => preset.widths.join('/') === block.columns.map((column) => column.widthPercent).join('/'))
                ? []
                : [{ value: block.columns.map((column) => column.widthPercent).join('/'), label: 'Custom' }]),
            ]}
            onChange={(value) => {
              const widths = value.split('/').map(Number)
              set({ columns: block.columns.map((column, index) => ({ ...column, widthPercent: widths[index] ?? column.widthPercent })) })
            }}
          />
          <RangeField label="Gap" value={block.gap} min={0} max={48} unit="px" onChange={(gap) => set({ gap }, 'gap')} />
          <ToggleField label="Stack on mobile" hint="Columns become full-width rows on narrow screens." value={block.stackOnMobile} onChange={(stackOnMobile) => set({ stackOnMobile })} />
        </>
      )
    }
  }
}

function EmailSettings() {
  const { editor, mergeTags, colorMode } = useBuilder()
  const { subject, preheader, theme } = editor.document
  const palette = theme[colorMode]

  return (
    <>
      <TextField
        label="Subject line"
        value={subject}
        onChange={(value) => editor.updateMeta({ subject: value }, 'subject')}
        action={<MergeTagMenu tags={mergeTags} onPick={(tag) => editor.updateMeta({ subject: subject + tag }, 'subject')} />}
      />
      <TextField
        label="Preheader"
        value={preheader}
        hint="The grey preview text shown after the subject in most inboxes. Aim for 40-90 characters."
        onChange={(value) => editor.updateMeta({ preheader: value }, 'preheader')}
      />
      <h3 className="nb-subtitle">Typography</h3>
      <SelectField label="Body font" value={theme.fontStack} options={FONT_OPTIONS} onChange={(fontStack) => editor.updateTheme({ fontStack })} />
      <SelectField label="Heading font" value={theme.headingFontStack} options={FONT_OPTIONS} onChange={(headingFontStack) => editor.updateTheme({ headingFontStack })} />
      <p className="nb-hint">Only email-safe stacks are offered; most clients ignore web fonts.</p>
      <h3 className="nb-subtitle">Layout</h3>
      <RangeField label="Content width" value={theme.contentWidth} min={480} max={720} step={10} unit="px" onChange={(contentWidth) => editor.updateTheme({ contentWidth }, 'width')} />
      <RangeField label="Corner radius" value={theme.containerRadius} min={0} max={24} unit="px" onChange={(containerRadius) => editor.updateTheme({ containerRadius }, 'radius')} />
      <h3 className="nb-subtitle">Colours ({colorMode} mode)</h3>
      <p className="nb-hint">Use the Light / Dark toggle in the toolbar to edit the other palette.</p>
      {COLOR_FIELDS.map((field) => (
        <ColorField
          key={field.key}
          label={field.label}
          value={palette[field.key]}
          onChange={(value) => editor.updateTheme({ [colorMode]: { ...palette, [field.key]: value } }, `color:${colorMode}:${field.key}`)}
        />
      ))}
    </>
  )
}

/**
 * Props for {@link VariablesPanel}.
 *
 * @internal
 */
export interface VariablesPanelProps {
  /** Host-controlled values that cannot be edited here. */
  variables: Record<string, string>
  /** Sample values used for previews. */
  previewData: Record<string, string>
  onPreviewDataChange: (data: Record<string, string>) => void
  /** Restores the original example values. */
  onReset: () => void
}

function VariablesPanel({ variables, previewData, onPreviewDataChange, onReset }: VariablesPanelProps) {
  const { editor, mergeTags } = useBuilder()
  const doc = editor.document
  const used = new Set(extractMergeTags(JSON.stringify(doc.blocks) + doc.subject + doc.preheader))
  const known = new Set(mergeTags.map((tag) => tag.name))
  const names = [...mergeTags.map((tag) => tag.name), ...Array.from(used).filter((name) => !known.has(name))]

  return (
    <>
      <p className="nb-callout">
        <Icon name="braces" /> Type <code>{'{{firstName}}'}</code> anywhere, or use the Variable menus. Sample values below only affect previews; exported HTML keeps the tags unless you pass <code>variables</code>.
      </p>
      {names.map((name) => {
        const locked = Object.prototype.hasOwnProperty.call(variables, name)
        const label = mergeTags.find((tag) => tag.name === name)?.label ?? name
        return (
          <div key={name} className="nb-field">
            <div className="nb-field-head">
              <label htmlFor={`nb-var-${name}`} className="nb-label">
                {label} <code className="nb-code-inline">{`{{${name}}}`}</code>
              </label>
              <span className="nb-badge" data-tone={used.has(name) ? 'on' : 'off'}>
                {used.has(name) ? 'In use' : 'Unused'}
              </span>
            </div>
            <input
              id={`nb-var-${name}`}
              className="nb-input"
              value={locked ? variables[name] : (previewData[name] ?? '')}
              disabled={locked}
              onChange={(event) => onPreviewDataChange({ ...previewData, [name]: event.target.value })}
            />
            {locked ? <p className="nb-hint">Set by the host app through the variables prop.</p> : null}
          </div>
        )
      })}
      <button type="button" className="nb-btn nb-btn-ghost nb-btn-block" onClick={onReset}>
        Reset sample data
      </button>
    </>
  )
}

/**
 * Props for {@link Inspector}.
 *
 * @internal
 */
export interface InspectorProps extends VariablesPanelProps {}

/**
 * The right-hand properties panel with Block, Email and Variables tabs.
 *
 * @param props - Variable data and handlers.
 * @returns The inspector.
 * @internal
 */
export function Inspector(props: InspectorProps) {
  const { editor } = useBuilder()
  const [tab, setTab] = useState<'block' | 'email' | 'variables' | null>(null)
  const selected = editor.selectedBlock

  useEffect(() => {
    setTab(null)
  }, [editor.selectedId])

  const active = tab ?? (selected ? 'block' : 'email')
  const tabs = [
    { id: 'block', label: 'Block' },
    { id: 'email', label: 'Email' },
    { id: 'variables', label: 'Variables' },
  ] as const

  return (
    <aside className="nb-inspector" aria-label="Properties">
      <div className="nb-tabs" role="tablist" aria-label="Inspector sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`nb-tab-${item.id}`}
            aria-selected={active === item.id}
            aria-controls="nb-inspector-panel"
            className="nb-tab"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="nb-inspector-body" role="tabpanel" id="nb-inspector-panel" aria-labelledby={`nb-tab-${active}`}>
        {active === 'block' ? (
          selected ? (
            <>
              <h2 className="nb-panel-title">{blockLabel(selected.type)} settings</h2>
              <BlockInspector key={selected.id} block={selected} />
            </>
          ) : (
            <div className="nb-inspector-empty">
              <Icon name="edit" size={20} />
              <p>Select a block on the canvas to edit it.</p>
            </div>
          )
        ) : null}
        {active === 'email' ? <EmailSettings /> : null}
        {active === 'variables' ? <VariablesPanel {...props} /> : null}
      </div>
    </aside>
  )
}
