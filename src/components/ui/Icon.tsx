import type { SVGProps } from "react";
import type { IconName } from "@/types/game";

const paths: Record<IconName, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 3.5c1.8 0 3 1.6 3 3.4 0 1.9-1.2 3.1-3 3.1s-3-1.2-3-3.1c0-1.8 1.2-3.4 3-3.4ZM12 20.5c-1.8 0-3-1.6-3-3.4 0-1.9 1.2-3.1 3-3.1s3 1.2 3 3.1c0 1.8-1.2 3.4-3 3.4ZM3.5 12c0-1.8 1.6-3 3.4-3 1.9 0 3.1 1.2 3.1 3s-1.2 3-3.1 3c-1.8 0-3.4-1.2-3.4-3ZM20.5 12c0 1.8-1.6 3-3.4 3-1.9 0-3.1-1.2-3.1-3s1.2-3 3.1-3c1.8 0 3.4 1.2 3.4 3Z" />
    </>
  ),
  photo: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17.5l4.8-4.6 3.3 3 2.9-2.6 5 4.2" />
    </>
  ),
  bottle: (
    <>
      <path d="M10 2.5h4v3.2l1.6 2.3c.6.9.9 1.9.9 3v8.5a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V11c0-1.1.3-2.1.9-3L10 5.7V2.5Z" />
      <path d="M9 13.5h6M9 16.5h4" />
    </>
  ),
  star: (
    <path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.5l6.1-.7L12 3.2Z" />
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15 12v2.5" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 4.5h11a2 2 0 0 1 2 2V17a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 17V6.5a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </>
  ),
  letter: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6.5L20.5 7" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
      <path d="M3 9h18M12 9v11.5M12 9c-1.5-3-5-4.5-6-2.2S9 9 12 9Zm0 0c1.5-3 5-4.5 6-2.2S15 9 12 9Z" />
    </>
  ),
  heart: (
    <path d="M12 20.5s-7.5-4.6-9-9.6C2 7.2 4.5 4 7.6 4c1.9 0 3.4 1.1 4.4 2.5C13 5.1 14.5 4 16.4 4 19.5 4 22 7.2 21 10.9c-1.5 5-9 9.6-9 9.6Z" />
  ),
  pause: (
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  play: <path d="M7 4.5l12 7.5-12 7.5V4.5Z" fill="currentColor" stroke="none" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8.5h14l-1 11.5H6L5 8.5Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  hand: (
    <path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5.5V4.5a1.5 1.5 0 0 1 3 0v7V6a1.5 1.5 0 0 1 3 0v8.2c0 3.4-2.4 6.3-5.8 6.3-2.3 0-3.7-.9-4.8-2.6L4 13.7a1.4 1.4 0 0 1 2.3-1.6L8 14.2" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16ZM5 15l.6 1.6L7.2 17.2l-1.6.6L5 19.4l-.6-1.6L2.8 17.2l1.6-.6L5 15Z" fill="currentColor" stroke="none" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  map: (
    <>
      <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2v-13Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  jump: (
    <>
      <path d="M12 19V7" />
      <path d="M6.5 12.5L12 7l5.5 5.5" />
      <path d="M5 20.5h14" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5l9 7-9 7V5Z" fill="currentColor" stroke="none" />
      <path d="M17.5 5v14" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/** Hand-drawn SVG icon set with a consistent 24px grid. */
export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
