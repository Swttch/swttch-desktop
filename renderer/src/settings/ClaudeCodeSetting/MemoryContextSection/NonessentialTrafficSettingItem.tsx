import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desktopApi } from '../../../api';
import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';
import { Tooltip } from '../../../Tooltip';
import { useProviderScope } from '../store';
import { SettingsLoading } from '../../SettingsLoading';
export function NonessentialTrafficSettingItem() {
  const copy = useSettingsCopy();
  const scope = useProviderScope(state => state.scope);
  const client = useQueryClient();
  const query = useQuery({queryKey:['provider-nonessential-traffic'],queryFn:desktopApi.nonessentialTraffic,refetchInterval:5000});
  const mutation = useMutation({mutationFn:desktopApi.updateNonessentialTraffic,onSuccess:data => {
    client.setQueryData(['provider-nonessential-traffic'],data);
    void client.invalidateQueries({queryKey:['provider-settings','claude-code']});
  }});
  const locked = query.data?.lock;
  const note = locked ? copy.nonessentialTrafficManaged.replace('{{path}}',locked.path ?? '') : copy.globalOnly;
  return <div><SettingsRow title={copy.nonessentialTraffic} description={copy.nonessentialTrafficDescription} settingPath="$.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC" settingDocumentation="https://code.claude.com/docs/en/settings#environment-variables" badge={<Tooltip content={note}><span role="img" tabIndex={0} aria-label={note} className="rounded bg-selected px-1 text-[10px] text-muted">{copy.globalBadge}</span></Tooltip>}>{!query.data && !query.error ? <SettingsLoading label={copy.providerLoading} /> : <Tooltip content={scope === 'project' || locked ? note : undefined}><SettingsSwitch label={copy.nonessentialTraffic} checked={query.data?.disabled ?? false} disabled={!query.data || scope === 'project' || !!locked || mutation.isPending} onChange={disabled => { void mutation.mutateAsync(disabled).catch(() => {}); }} /></Tooltip>}</SettingsRow>{(query.error || mutation.error) && <p role="alert" className="pb-3 text-sm text-red-400">{query.error?.message || mutation.error?.message}</p>}</div>;
}
