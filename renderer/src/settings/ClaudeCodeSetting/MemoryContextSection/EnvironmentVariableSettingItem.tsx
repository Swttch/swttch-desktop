import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { useProviderNestedField } from '../store';
import { RemoveEntry, TextEntry } from '../StructuredControls';
export function EnvironmentVariableSettingItem({ name }: { name: string }) {
  const copy = useSettingsCopy();
  const field = useProviderNestedField('env', name, '');
  return <ProviderSettingFrame settingKey={`env.${name}`} title={name} field={field}><div className="flex w-72 max-w-full items-center gap-2"><TextEntry label={`${copy.environmentValue}: ${name}`} value={String(field.value)} type={/KEY|TOKEN|SECRET|PASSWORD/i.test(name) ? 'password' : 'text'} onCommit={value => { void field.save(value).catch(() => {}); }} />{field.scopeValue != null && <RemoveEntry label={`${copy.removeEntry}: ${name}`} onRemove={() => { void field.save(null).catch(() => {}); }} />}</div></ProviderSettingFrame>;
}
