import { settingsCopy as copy } from '../../../../src/locales/settings.ko.mjs';
import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { desktopApi } from '../../api';
import { bindScopedShortcuts } from '../../../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from '../../shortcut-platform';
import { useSettingsActions } from '../actions';
export function AgentSetting() {
  const { onReturn, onHelp, onSidebar } = useSettingsActions();
  const view = useMutation({ mutationFn: desktopApi.settingsView });
  const cleanup = useRef<() => void>(() => {});
  const requested = useRef(false);
  const callbacks = useRef({ onReturn, onHelp, onSidebar }); callbacks.current = { onReturn, onHelp, onSidebar };
  useEffect(() => { if (!requested.current) { requested.current = true; view.mutate(); } return () => cleanup.current(); }, []);
  return view.data ? <iframe title={copy.agentSettings} src={view.data.url} className="h-full w-full border-0" onLoad={event => { cleanup.current(); const content = event.currentTarget.contentWindow; if (content) cleanup.current = bindScopedShortcuts(content, macShortcuts, command => { if (command === 'close') callbacks.current.onReturn(); if (command === 'help') callbacks.current.onHelp(); if (command === 'sidebar') callbacks.current.onSidebar(); }, browserShortcuts); }} /> : <div className="p-8" role="status"><p>{view.error?.message || copy.agentLoading}</p>{view.error && <button className="secondary-button mt-4" onClick={() => view.mutate()}>{copy.retry}</button>}</div>;
}
