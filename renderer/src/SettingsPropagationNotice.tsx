import { useSettingsCopy } from './i18n';

export function SettingsPropagationNotice({ onRetry }: { onRetry: () => void }) {
  const copy = useSettingsCopy();
  return <div className="flex items-center gap-3"><span>{copy.pluginSyncFailed}</span><button type="button" className="shrink-0 rounded px-2 py-1 underline underline-offset-4 hover:bg-selected" onClick={onRetry}>{copy.retry}</button></div>;
}
