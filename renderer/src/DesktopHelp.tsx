import { t, useShellTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { shortcutLabel, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';
import type { ShortcutRow } from './tab-action';

export const entries: { command: DesktopCommand; label: string }[] = [
  { command: 'refresh', label: "Refresh current tab" },
  { command: 'move-left', label: "Move tab to a new panel on the left" }, { command: 'move-right', label: "Move tab to a new panel on the right" }, { command: 'move-up', label: "Move tab to a new panel above" }, { command: 'move-down', label: "Move tab to a new panel below" },
  { command: 'new-tab', label: "New chat tab" }, { command: 'split-columns', label: "Split horizontally" }, { command: 'split-rows', label: "Split vertically" }, { command: 'rename', label: "Rename chat" }, { command: 'favorite', label: "Toggle chat favorite" }, { command: 'close', label: "Close current tab" }, { command: 'tab-left', label: "Previous tab" }, { command: 'tab-right', label: "Next tab" }, { command: 'panel-left', label: "Focus panel on the left" }, { command: 'panel-right', label: "Focus panel on the right" }, { command: 'panel-up', label: "Focus panel above" }, { command: 'panel-down', label: "Focus panel below" }, { command: 'sidebar', label: "Toggle sidebar" }, { command: 'help', label: "Toggle keyboard shortcuts" }, { command: 'settings', label: "Open settings" },
];
const applicable = new Set(['openModelMenu', 'rotateModel', 'clearConversation', 'sendMessage', 'insertNewline', 'cyclePermissionMode', 'recallPrompt', 'toggleDictation', 'lineEdges', 'textStart', 'textEnd', 'wordMove', 'emacsParagraphEdges', 'emacsCharacterMove', 'emacsLineMove', 'emacsDelete', 'emacsKill', 'emacsYank', 'emacsTranspose', 'emacsOpenLine', 'emacsPageDown', 'emacsCenter']);
export function DesktopHelp({ getShortcuts, onClose }: { getShortcuts: () => Promise<ShortcutRow[]>; onClose: () => void }) { useShellTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<ShortcutRow[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    let alive = true;
    void getShortcuts().then(data => { if (alive) setRows(data); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; if (focused?.isConnected) focused.focus(); };
  }, []);
  const owned = new Set(entries.map(entry => shortcutLabel(entry.command, macShortcuts, browserShortcuts).replace(/\+/g, '')));
  const common = rows.filter(row => applicable.has(row.id)).map(row => ({ ...row, combos: row.combos.filter(combo => !owned.has(combo.join('').replace(/\+/g, ''))) })).filter(row => row.combos.length);
  return <dialog ref={dialog} aria-label={t("Keyboard shortcuts")} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="fixed inset-0 m-auto! flex max-h-[85dvh] w-[min(38rem,calc(100vw-2rem))] flex-col rounded-lg border border-divider bg-navigation p-5 text-foreground backdrop:bg-black/50">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">{t("Keyboard shortcuts")}</h2><button type="button" aria-label={t("Close keyboard shortcuts")} className="icon-button" onClick={onClose}>×</button></div>
    <div className="min-h-0 overflow-y-auto text-sm"><h3 className="mb-2 font-medium text-muted">{t("Tabs and panels")}</h3>{entries.map(entry => <div key={entry.command} className="flex items-center justify-between gap-4 border-b border-divider py-2"><span>{t(entry.label)}</span><kbd className="shortcut-keys shrink-0">{shortcutLabel(entry.command, macShortcuts, browserShortcuts)}</kbd></div>)}
      {!!common.length && <section className="mt-5"><h3 className="mb-2 font-medium text-muted">{t("Chat and text editing")}</h3>{common.map(row => <div key={row.id} className="flex items-center justify-between gap-4 border-b border-divider py-2"><span>{row.label}</span><span className="shortcut-keys shrink-0">{row.combos.map(combo => combo.join(macShortcuts ? '' : '+')).join(' / ')}</span></div>)}</section>}
      {failed && <p role="status" className="mt-4 text-xs text-muted">{t("Could not load chat shortcuts. Load a tab and try again.")}</p>}
    </div>
  </dialog>;
}
