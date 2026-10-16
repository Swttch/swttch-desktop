import { useSettingsCopy } from '../../../i18n';
import { SettingsSwitch } from '../../../SettingsControls';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { useProviderNestedField } from '../store';
export function VoiceEnabledSettingItem() {
  const copy = useSettingsCopy();
  const field = useProviderNestedField('voice', 'enabled', true);
  return <ProviderSettingFrame settingKey="voice.enabled" title={copy.voiceEnabled} description={copy.voiceEnabledDescription} documentation="https://code.claude.com/docs/en/voice-dictation" field={field}><SettingsSwitch label={copy.voiceEnabled} checked={field.value !== false} disabled={field.pending} onChange={value => { void field.save(value).catch(() => {}); }} /></ProviderSettingFrame>;
}
