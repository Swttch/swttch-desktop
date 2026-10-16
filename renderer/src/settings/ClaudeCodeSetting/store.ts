import { create } from 'zustand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { desktopApi } from '../../api';
import { providerField, providerNestedField, settingObject, updateProviderEntry, ProviderScope, type SettingValue } from '../../../../src/provider-settings.mjs';

export const useProviderScope = create<{ scope: ProviderScope; projectId: string; select: (scope: ProviderScope, projectId: string) => void }>(set => ({
  scope: ProviderScope.Global, projectId: '', select: (scope, projectId) => set({ scope, projectId }),
}));
export function useProviderSettings() {
  const scope = useProviderScope(state => state.scope);
  const projectId = useProviderScope(state => state.projectId);
  return useQuery({ queryKey: ['provider-settings', 'claude-code', scope, projectId], queryFn: () => desktopApi.claudeSettings(scope, projectId), enabled: scope === ProviderScope.Global || !!projectId, refetchInterval: 5000 });
}
export function useProviderField(key: string, fallback: SettingValue) {
  const scope = useProviderScope(state => state.scope);
  const projectId = useProviderScope(state => state.projectId);
  const query = useProviderSettings();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (value: SettingValue) => desktopApi.updateClaudeSettings(scope, projectId, key, value), onSuccess: async data => {
    client.setQueryData(['provider-settings', 'claude-code', scope, projectId], data);
    await client.invalidateQueries({ queryKey: ['provider-settings', 'claude-code'] });
  } });
  return { ...providerField(query.data, scope, key, fallback), scope, scopeValue: query.data?.settings?.[key], save: async (value: SettingValue) => { await mutation.mutateAsync(value); }, pending: mutation.isPending, error: mutation.error?.message };
}

export function useProviderCatalog() {
  const projectId = useProviderScope(state => state.projectId);
  return useQuery({ queryKey: ['provider-models', 'claude-code', projectId], queryFn: () => desktopApi.claudeModels(projectId), staleTime: 300000 });
}

/** Reset only this nested permission key, preserving sibling overrides. */
export function useProviderNestedField(parentKey: string, key: string, fallback: SettingValue) {
  const parent = useProviderField(parentKey, {});
  const query = useProviderSettings();
  const client = useQueryClient();
  const projectId = useProviderScope(state => state.projectId);
  return { ...parent, ...providerNestedField(query.data, parent.scope, parentKey, key, fallback),
    scopeValue: settingObject(parent.scopeValue)[key],
    save: async (value: SettingValue) => {
      const current = client.getQueryData<typeof query.data>(['provider-settings', 'claude-code', parent.scope, projectId]);
      await parent.save(updateProviderEntry(current?.settings?.[parentKey], key, value));
    },
  };
}

export function usePermissionField(key: string, fallback: SettingValue) { return useProviderNestedField('permissions', key, fallback); }
