import type { ReactNode } from 'react';
import type { DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { PATH } from './routes';

export const isWorkPage = (path: string) => path === PATH.HOME;
export const canExecuteWorkCommand = (active: boolean, command: DesktopCommand) => active || ['help', 'settings', 'sidebar', 'new-tab'].includes(command);

export function WorkPage({ active, children }: { active: boolean; children: ReactNode }) {
  return <div data-work-page aria-label="작업 페이지" aria-hidden={!active} inert={!active} style={{ display: active ? 'contents' : 'none' }}>{children}</div>;
}
