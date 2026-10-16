import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desktopApi } from '../../../api';
import { useSettingsCopy } from '../../../i18n';
import { SettingsLoading } from '../../SettingsLoading';
import { ProviderScope } from '../../../../../src/provider-settings.mjs';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { TextEntry } from '../StructuredControls';
import { useProviderScope } from '../store';
export function ConfigDirectorySettingItem() {
  const copy = useSettingsCopy();
  const scope = useProviderScope(state => state.scope);
  const projectId = useProviderScope(state => state.projectId);
  const client = useQueryClient();
  const queryKey = ['provider-config-directory',scope,projectId];
  const query = useQuery({queryKey,queryFn:()=>desktopApi.claudeConfigDirectory(scope,projectId),refetchInterval:5000});
  const mutation = useMutation({mutationFn:(value: string | null)=>desktopApi.updateClaudeConfigDirectory(scope,projectId,value),onSuccess:data=>{
    client.setQueryData(queryKey,data);
    void client.invalidateQueries({queryKey:['provider-settings','claude-code']});
    void client.invalidateQueries({queryKey:['provider-config-directory']});
    void client.invalidateQueries({queryKey:['provider-cli-auto-update']});
    void client.invalidateQueries({queryKey:['provider-nonessential-traffic']});
  }});
  const value = (scope === ProviderScope.Project ? query.data?.projectSetting : query.data?.globalSetting) ?? '';
  const field = {scope,value,scopeValue:value,inherited:scope === ProviderScope.Project && !query.data?.projectSetting,shadowed:scope === ProviderScope.Global && !!query.data?.projectSetting,pending:!query.data || mutation.isPending,error:query.error?.message || mutation.error?.message,save:async (next: import('../../../../../src/provider-settings.mjs').SettingValue)=>{await mutation.mutateAsync(typeof next === 'string' && next.trim() ? next.trim() : null);}};
  return <ProviderSettingFrame settingKey="env.CLAUDE_CONFIG_DIR" title="CLAUDE_CONFIG_DIR" description={copy.configDirectoryDescription} documentation="https://code.claude.com/docs/en/settings#environment-variables" field={field}>{!query.data && !query.error ? <SettingsLoading label={copy.providerLoading} /> : <div className="w-72 max-w-full space-y-1"><TextEntry disabled={field.pending} label="CLAUDE_CONFIG_DIR" placeholder={copy.configDirectoryPlaceholder} value={value} onCommit={value=>{void field.save(value).catch(()=>{});}} /><p className="break-all text-end text-xs text-muted">{copy.configDirectoryEffective.replace('{{value}}',query.data?.effective ?? '')}</p></div>}</ProviderSettingFrame>;
}
