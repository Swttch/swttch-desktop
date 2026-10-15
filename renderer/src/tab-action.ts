import { t } from '../../src/interface-i18n.mjs';
import { DESKTOP_TAB_ACTION, DESKTOP_TAB_RESULT, type DesktopTabAction } from '../../../../webview/src/shared/desktop-tab';
export type { DesktopTabAction, ShortcutRow } from '../../../../webview/src/shared/desktop-tab';

export function activateTabAction(frame: HTMLIFrameElement, action: DesktopTabAction): Promise<{ shortcuts?: import('./tab-action').ShortcutRow[] }> {
  const target = frame.contentWindow;
  if (!target) return Promise.reject(new Error(t("Load the chat view and try again.")));
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => { window.removeEventListener('message', receive); clearTimeout(timer); };
    const receive = (event: MessageEvent) => {
      if (event.source !== target || event.origin !== window.location.origin || event.data?.type !== DESKTOP_TAB_RESULT || event.data?.id !== id) return;
      cleanup();
      if (event.data.ok === true) resolve({ shortcuts: event.data.shortcuts }); else reject(new Error(t("Could not open this feature in the tab.")));
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error(t("The chat view is not responding to tab commands. Check its version."))); }, 3000);
    window.addEventListener('message', receive);
    target.postMessage({ type: DESKTOP_TAB_ACTION, id, action }, window.location.origin);
  });
}
