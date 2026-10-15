import { useSettingsCopy } from '../../../i18n';
import { interfaceLanguages } from '../../../../../src/interface-languages.mjs';
import { useSettingsStore, updateSettings } from '../../store';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
export function LanguageSettingItem() {
  const copy = useSettingsCopy();
  const language = useSettingsStore(state => state.values.general.language);
  return <SettingsRow title={copy.language} description={copy.languageDescription}><SettingsSelect label={copy.language} value={language} options={interfaceLanguages} onChange={value => { void updateSettings({ general: { language: value } }); }} /></SettingsRow>;
}
