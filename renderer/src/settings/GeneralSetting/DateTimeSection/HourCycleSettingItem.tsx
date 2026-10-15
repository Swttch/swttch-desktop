import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function HourCycleSettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.hourCycle); return <SettingsRow title={copy.clockHourCycle}><SettingsSelect label={copy.clockHourCycle} value={value} options={[{ value: '12', label: copy.hours12 }, { value: '24', label: copy.hours24 }]} onChange={value => void updateSettings({ clock: { hourCycle: value === '24' ? '24' : '12' } })} /></SettingsRow>; }
