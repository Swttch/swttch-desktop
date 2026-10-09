import { useState } from 'react';

const STORAGE_KEY = 'swttch-sidebar-width';
const clamp = (width: number) => Math.max(196, Math.min(480, width));
export function useSidebarWidth() {
  const [width, setWidth] = useState(() => { const saved = Number(localStorage.getItem(STORAGE_KEY)); return saved ? clamp(saved) : 224; });
  const save = (next: number) => { const value = clamp(next); setWidth(value); localStorage.setItem(STORAGE_KEY, String(value)); };
  return { width, save };
}
export function SidebarResize({ width, onResize }: { width: number; onResize: (width: number) => void }) {
  return <div role="separator" aria-label="사이드바 너비 조절" aria-orientation="vertical" aria-valuemin={196} aria-valuemax={480} aria-valuenow={width} tabIndex={0}
    className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize touch-none hover:bg-blue-400/50 focus-visible:bg-blue-400/50"
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) onResize(event.clientX - (event.currentTarget.parentElement?.getBoundingClientRect().left || 0)); }}
    onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); }}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onResize(width + (event.key === 'ArrowLeft' ? -14 : 14)); } }} />;
}
