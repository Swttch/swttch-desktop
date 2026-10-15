import { t, useShellTranslation } from './i18n';
import { useSettingsStore, updateSettings } from './settings/store';

export function useSidebarWidth() {
  const width = useSettingsStore(state => state.values.sidebar.width);
  const save = (next: number) => { void updateSettings({ sidebar: { width: Math.max(196, Math.min(480, next)) } }); };
  return { width, save };
}
export function SidebarResize({ width, onResize }: { width: number; onResize: (width: number) => void }) { useShellTranslation();
  return <div role="separator" aria-label={t("Resize sidebar")} aria-orientation="vertical" aria-valuemin={196} aria-valuemax={480} aria-valuenow={width} tabIndex={0}
    className="absolute inset-y-0 end-0 z-20 w-1 cursor-col-resize touch-none hover:bg-blue-400/50 focus-visible:bg-blue-400/50"
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { const rect = event.currentTarget.parentElement!.getBoundingClientRect(); onResize(document.documentElement.dir === 'rtl' ? rect.right - event.clientX : event.clientX - rect.left); } }}
    onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); }}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onResize(width + (event.key === 'ArrowLeft' ? -14 : 14) * (document.documentElement.dir === 'rtl' ? -1 : 1)); } }} />;
}
