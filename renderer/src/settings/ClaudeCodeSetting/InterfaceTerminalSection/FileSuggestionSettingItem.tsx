import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { useProviderField } from '../store';
import { TextEntry } from '../StructuredControls';
import { fileSuggestionValue, settingObject } from '../../../../../src/provider-settings.mjs';
export function FileSuggestionSettingItem() {
  const copy = useSettingsCopy();
  const field = useProviderField('fileSuggestion', null);
  const command = settingObject(field.value).command;
  return <ProviderSettingFrame settingKey="fileSuggestion" title={copy.providerFileSuggestion} description={copy.providerFileSuggestionDescription} field={field}><div className="w-72 max-w-full"><TextEntry label={copy.fileSuggestionCommand} placeholder={copy.fileSuggestionPlaceholder} value={typeof command === 'string' ? command : ''} onCommit={value => { void field.save(fileSuggestionValue(field.value, value)).catch(() => {}); }} /></div></ProviderSettingFrame>;
}
