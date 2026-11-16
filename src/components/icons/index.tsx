import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'overview'
  | 'graph'
  | 'sparkles'
  | 'library'
  | 'plus'
  | 'settings'
  | 'search'
  | 'chevronDown'
  | 'chevronRight'
  | 'arrowRight'
  | 'arrowLeft'
  | 'arrowUpRight'
  | 'close'
  | 'menu'
  | 'upload'
  | 'file'
  | 'check'
  | 'link'
  | 'layers'
  | 'zoomIn'
  | 'zoomOut'
  | 'reset'
  | 'bookmark'
  | 'info'
  | 'alert'
  | 'download'
  | 'clock'
  | 'filter'
  | 'target'
  | 'eye';

const GLYPHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  graph: (
    <>
      <path d="M12 12 5.5 6.2M12 12l6.8-5.4M12 12l-4.6 7.4M12 12l6 6.2" />
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="4.4" cy="5.4" r="1.7" />
      <circle cx="19.6" cy="5.8" r="1.7" />
      <circle cx="6.6" cy="20.2" r="1.7" />
      <circle cx="19.2" cy="19.6" r="1.7" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7z" />
      <path d="M18.5 15.5l.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.2-.8 2.2-.8z" />
    </>
  ),
  library: (
    <>
      <path d="M4.5 5.6A2.6 2.6 0 0 1 7.1 3H19v18H7.1a2.6 2.6 0 0 1-2.6-2.6z" />
      <path d="M8 3v18" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <path d="M4 7h9M18 7h2M4 17h3M12 17h8" />
      <circle cx="15.5" cy="7" r="2.2" />
      <circle cx="9.5" cy="17" r="2.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  arrowLeft: <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  upload: <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4.5 20h15" />,
  file: (
    <>
      <path d="M13.5 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8.5z" />
      <path d="M13.5 3v5.5H19" />
    </>
  ),
  check: <path d="m4.5 12.5 4.8 4.8L19.5 6.5" />,
  link: (
    <>
      <path d="M10 13.8a4.4 4.4 0 0 0 6.3 0l2.2-2.2a4.5 4.5 0 0 0-6.3-6.3l-1.2 1.2" />
      <path d="M14 10.2a4.4 4.4 0 0 0-6.3 0l-2.2 2.2a4.5 4.5 0 0 0 6.3 6.3l1.2-1.2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8.5 4.6L12 12.2 3.5 7.6z" />
      <path d="m3.5 12.4 8.5 4.6 8.5-4.6M3.5 16.8l8.5 4.6 8.5-4.6" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="6.3" />
      <path d="m15.8 15.8 4.7 4.7M8.4 11h5.2M11 8.4v5.2" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="6.3" />
      <path d="m15.8 15.8 4.7 4.7M8.4 11h5.2" />
    </>
  ),
  reset: (
    <>
      <path d="M3.8 12a8.2 8.2 0 1 1 2.6 6" />
      <path d="M3.4 7.6v4.6h4.6" />
    </>
  ),
  bookmark: <path d="M6.5 4h11v16.5L12 16.6l-5.5 3.9z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.2M12 8.1v.1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.8 21 20H3z" />
      <path d="M12 9.6v4.8M12 17.2v.1" />
    </>
  ),
  download: <path d="M12 3.8v12.4M7.2 11.5 12 16.3l4.8-4.8M4.2 20.2h15.6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.4V19l-3.6 1.7v-7.8z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.2 9.5-6.2S21.5 12 21.5 12s-3.5 6.2-9.5 6.2S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  );
}

/** The Matrix mark: four nodes and the links between them. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g stroke="var(--mint)" strokeWidth="1.3" opacity="0.75" fill="none">
        <path d="M9 10.5 22 14M9 10.5l4.5 14M22 14l-8.5 10.5" />
      </g>
      <circle cx="9" cy="10.5" r="3.1" fill="var(--mint)" />
      <circle cx="22" cy="14" r="2.6" fill="var(--violet)" />
      <circle cx="13.5" cy="24.5" r="2.3" fill="var(--mint)" opacity="0.7" />
    </svg>
  );
}
