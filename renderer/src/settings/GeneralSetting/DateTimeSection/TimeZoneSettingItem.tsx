import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
const timeZones = [...new Set(['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone, ...Intl.supportedValuesOf('timeZone')])].sort();
export function TimeZoneSettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.timeZone); return <SettingsRow title={copy.clockTimeZone}><SettingsSelect label={copy.clockTimeZone} value={value} options={[{ value: '', label: copy.clockComputerZone }, ...timeZones.map(value => ({ value, label: value }))]} onChange={value => void updateSettings({ clock: { timeZone: value } })} /></SettingsRow>; }
