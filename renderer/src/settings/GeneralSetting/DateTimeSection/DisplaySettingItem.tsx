import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function DisplaySettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.display); return <SettingsRow title={copy.clockDisplay}><SettingsSelect label={copy.clockDisplay} value={value} options={[{ value: 'date-time', label: copy.clockDateTime }, { value: 'time', label: copy.clockTime }]} onChange={value => void updateSettings({ clock: { display: value === 'time' ? 'time' : 'date-time' } })} /></SettingsRow>; }
