import { useQuery } from '@tanstack/react-query';
import { desktopApi } from '../../api';
import { SettingsSelect } from '../../SettingsControls';
import { useSettingsCopy } from '../../i18n';
import { ProviderScope } from '../../../../src/provider-settings.mjs';
import { useProviderScope } from './store';
export function ScopeControl() {
  const copy = useSettingsCopy();
  const { scope, projectId, select } = useProviderScope();
  const projects = useQuery({ queryKey: ['desktop', 'projects'], queryFn: () => desktopApi.projects() });
  const rows = (projects.data?.projects || []).filter(row => !row.hiddenAt);
  const options = [{ value: '', label: copy.chooseProject }, ...rows.map(row => ({ value: String(row.id), label: row.alias || row.path.split('/').pop() || row.path }))];
  const chosen = rows.find(row => String(row.id) === projectId);
  return <div className="mb-9 space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label={copy.providerScope} className="inline-flex rounded-xl bg-navigation p-1">{[[ProviderScope.Global, copy.globalScope], [ProviderScope.Project, copy.projectScope]].map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} className={`rounded-lg px-4 py-2 hover:bg-selected ${scope === value ? 'bg-selected text-foreground' : 'text-muted'}`} onClick={() => select(value as ProviderScope, projectId)}>{label}</button>)}</div>
      <SettingsSelect label={copy.chooseProject} value={projectId} options={options} onChange={id => select(scope, id)} />
    </div>
    <p className="text-sm text-muted">{scope === ProviderScope.Global ? copy.scopeGlobalDescription : copy.scopeProjectDescription}</p>
    {chosen && <p className="break-all text-xs text-muted">{chosen.path}</p>}
    {projects.error && <p role="alert" className="text-sm text-red-400">{projects.error.message}</p>}
  </div>;
}
