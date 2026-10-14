import { PATH } from '../../src/paths.mjs';

/** Retain every session parameter while embedding through the shell origin. */
export function sessionFrameUrl(sessionUrl: string, shellOrigin: string) {
  const source = new URL(sessionUrl);
  source.searchParams.set('is_desktop', '1');
  if (!source.pathname.startsWith(PATH.SESSIONS + '/') || !source.searchParams.get('workingDir')?.trim()) {
    throw new Error('세션 URL과 workingDir를 확인해 주세요.');
  }
  return new URL(source.pathname + source.search + source.hash, shellOrigin).href;
}
