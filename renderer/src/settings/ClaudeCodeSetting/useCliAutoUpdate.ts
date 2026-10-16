import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desktopApi } from '../../api';
import { useSettingsCopy } from '../../i18n';
import { ProviderScope } from '../../../../src/provider-settings.mjs';
export function useCliAutoUpdate() {
  const copy = useSettingsCopy();
  const client = useQueryClient();
  const query = useQuery({queryKey:['provider-cli-auto-update'],queryFn:desktopApi.cliAutoUpdate,refetchInterval:5000});
  const refresh = (data: Awaited<ReturnType<typeof desktopApi.cliAutoUpdate>>) => {
    client.setQueryData(['provider-cli-auto-update'],data);
    void client.invalidateQueries({queryKey:['provider-settings','claude-code']});
  };
  const enabled = useMutation({mutationKey:['provider-cli-auto-update','enabled'],mutationFn:desktopApi.updateCliAutoUpdate,onSuccess:refresh});
  const channel = useMutation({mutationKey:['provider-cli-auto-update','channel'],mutationFn:async (value: string) => {
    await desktopApi.updateClaudeSettings(ProviderScope.Global,'','autoUpdatesChannel',value === 'latest' ? null : value);
    return desktopApi.cliAutoUpdate();
  },onSuccess:refresh});
  const saving = useIsMutating({mutationKey:['provider-cli-auto-update']}) > 0;
  const lock = query.data?.lock;
  const messages = {'environment':copy.autoUpdateLockEnvironment,'user-settings':copy.autoUpdateLockUserSettings,'managed-settings':copy.autoUpdateLockManagedSettings,'global-config':copy.autoUpdateLockGlobalConfig};
  const lockText = !lock ? '' : lock.variable === 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' && lock.kind !== 'managed-settings'
    ? `${copy.nonessentialTraffic} · ${copy.topicMemoryContext} → ${copy.providerEnv}`
    : messages[lock.kind].replace('{{variable}}',lock.variable ?? '').replace('{{path}}',lock.path ?? '');
  return {query,enabled,channel,lockText,saving};
}
