export type DesktopCommand = 'rename' | 'close' | 'favorite' | 'help' | 'settings' | 'new-tab' | 'sidebar' | 'split-columns' | 'split-rows' | 'tab-left' | 'tab-right' | 'panel-left' | 'panel-right' | 'panel-up' | 'panel-down';
export function matchShortcut(event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing'>, mac: boolean, browser?: boolean): DesktopCommand | null;
export function shortcutLabel(command: DesktopCommand, mac: boolean, browser?: boolean): string;
export function bindScopedShortcuts(target: EventTarget, mac: boolean, execute: (command: DesktopCommand, event: KeyboardEvent) => void, browser?: boolean): () => void;
export function neighboringPanel(rects: Record<string, { left: number; top: number; width: number; height: number }>, currentId: string, direction: string): string | null;
