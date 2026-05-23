import React from "react";

type Props = {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.6 }: Props) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  const icons: Record<string, React.ReactElement> = {
    mic:          <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
    stop:         <svg {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" fill={color} stroke={color}/></svg>,
    speaker:      <svg {...p}><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>,
    "speaker-off":<svg {...p}><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="m17 9 4 6m0-6-4 6"/></svg>,
    swap:         <svg {...p}><path d="M7 8h13l-3-3M17 16H4l3 3"/></svg>,
    settings:     <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>,
    search:       <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
    plus:         <svg {...p}><path d="M12 5v14M5 12h14"/></svg>,
    sparkle:      <svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></svg>,
    waveform:     <svg {...p}><path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 12h2"/></svg>,
    keyboard:     <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01M8 17h8"/></svg>,
    copy:         <svg {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>,
    bookmark:     <svg {...p}><path d="M6 4h12v17l-6-4-6 4V4z"/></svg>,
    download:     <svg {...p}><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>,
    "panel-left":  <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>,
    x:             <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  };
  return icons[name] ?? null;
}
