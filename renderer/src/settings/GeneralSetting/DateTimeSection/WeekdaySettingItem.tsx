import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function WeekdaySettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.weekday); const disabled = useSettingsStore(state => state.values.clock.display === 'time'); return <SettingsRow title={copy.clockWeekday}><SettingsSwitch label={copy.clockWeekday} checked={value} disabled={disabled} onChange={value => void updateSettings({ clock: { weekday: value } })} /></SettingsRow>; }
