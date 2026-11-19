import type { ReactElement, SVGProps } from 'react'

/**
 * Names of the dependency-free icons bundled with the builder.
 *
 * @internal
 */
export type IconName =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'footer'
  | 'undo'
  | 'redo'
  | 'sun'
  | 'moon'
  | 'desktop'
  | 'mobile'
  | 'copy'
  | 'download'
  | 'trash'
  | 'duplicate'
  | 'up'
  | 'down'
  | 'grip'
  | 'check'
  | 'close'
  | 'info'
  | 'help'
  | 'braces'
  | 'warning'
  | 'upload'
  | 'link'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'edit'
  | 'eye'
  | 'code'
  | 'file'
  | 'wand'

const PATHS: Record<IconName, ReactElement> = {
  header: <path d="M6 4v16M18 4v16M6 12h12" />,
  text: <path d="M4 7h16M4 12h16M4 17h10" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  button: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M8 12h8" />
    </>
  ),
  divider: <path d="M3 12h18" />,
  spacer: <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />,
  columns: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </>
  ),
  footer: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 15h18M7 18h4" />
    </>
  ),
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  redo: <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  desktop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  download: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  duplicate: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M4 16V5a2 2 0 0 1 2-2h11M14.5 11.5v6M11.5 14.5h6" />
    </>
  ),
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
    </>
  ),
  braces: <path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.500 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.500 1 3 2 3-1 0-2 1.500-2 3v2c0 2-1 3-3 3" />,
  warning: (
    <>
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.700 3h15.800a2 2 0 0 0 1.700-3L13.700 3.900a2 2 0 0 0-3.400 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  upload: <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" />,
  link: <path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" />,
  bold: <path d="M7 5h6a3.500 3.500 0 0 1 0 7H7zM7 12h7a3.500 3.500 0 0 1 0 7H7z" />,
  italic: <path d="M19 4h-9M14 20H5M15 4 9 20" />,
  underline: <path d="M6 4v7a6 6 0 0 0 12 0V4M4 21h16" />,
  edit: <path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z" />,
  eye: (
    <>
      <path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  wand: <path d="m4 20 12-12M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.300L21 14l-1.300.7L19 16l-.7-1.300L17 14l1.300-.7z" />,
}

/**
 * Props for {@link Icon}.
 *
 * @internal
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Pixel size of the square icon. @defaultValue 16 */
  size?: number
}

/**
 * Renders one of the bundled stroke icons.
 *
 * @param props - See {@link IconProps}. Icons are decorative (`aria-hidden`) by default.
 * @returns An inline SVG element.
 *
 * @internal
 */
export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
