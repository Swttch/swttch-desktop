import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function SecondsSettingItem() { const copy = useSettingsCopy(); const value = useSettingsStore(state => state.values.clock.seconds); return <SettingsRow title={copy.clockSeconds}><SettingsSwitch label={copy.clockSeconds} checked={value} onChange={value => void updateSettings({ clock: { seconds: value } })} /></SettingsRow>; }
