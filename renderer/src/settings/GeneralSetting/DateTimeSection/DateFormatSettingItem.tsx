import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function DateFormatSettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.dateFormat); const disabled = useSettingsStore(state => state.values.clock.display === 'time'); return <SettingsRow title={copy.clockDateFormat}><SettingsSelect label={copy.clockDateFormat} value={value} disabled={disabled} options={[{ value: 'long', label: copy.clockLongDate }, { value: 'short', label: copy.clockShortDate }]} onChange={value => void updateSettings({ clock: { dateFormat: value === 'short' ? 'short' : 'long' } })} /></SettingsRow>; }
