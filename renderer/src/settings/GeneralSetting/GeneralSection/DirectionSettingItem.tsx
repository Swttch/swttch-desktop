import { useSettingsCopy } from '../../../i18n';
import { useSettingsStore, updateSettings } from '../../store';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
export function DirectionSettingItem() {
  const copy = useSettingsCopy();
  const direction = useSettingsStore(state => state.values.general.direction);
  return <SettingsRow title={copy.direction} description={copy.directionDescription}><SettingsSelect label={copy.direction} value={direction} options={[{ value: 'auto', label: copy.directionAuto }, { value: 'ltr', label: copy.directionLtr }, { value: 'rtl', label: copy.directionRtl }]} onChange={value => { void updateSettings({ general: { direction: value as typeof direction } }); }} /></SettingsRow>;
}
