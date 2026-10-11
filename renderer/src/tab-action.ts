import { DESKTOP_TAB_ACTION, DESKTOP_TAB_RESULT, type DesktopTabAction } from '../../../../webview/src/shared/desktop-tab';
export type { DesktopTabAction } from '../../../../webview/src/shared/desktop-tab';

export function activateTabAction(frame: HTMLIFrameElement, action: DesktopTabAction): Promise<void> {
  const target = frame.contentWindow;
  if (!target) return Promise.reject(new Error('채팅 화면을 불러온 뒤 다시 시도해 주세요.'));
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => { window.removeEventListener('message', receive); clearTimeout(timer); };
    const receive = (event: MessageEvent) => {
      if (event.source !== target || event.origin !== window.location.origin || event.data?.type !== DESKTOP_TAB_RESULT || event.data?.id !== id) return;
      cleanup();
      if (event.data.ok === true) resolve(); else reject(new Error('이 탭에서 기능을 열지 못했습니다.'));
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('채팅 웹뷰가 탭 명령에 응답하지 않습니다. 웹뷰 버전을 확인해 주세요.')); }, 3000);
    window.addEventListener('message', receive);
    target.postMessage({ type: DESKTOP_TAB_ACTION, id, action }, window.location.origin);
  });
}
