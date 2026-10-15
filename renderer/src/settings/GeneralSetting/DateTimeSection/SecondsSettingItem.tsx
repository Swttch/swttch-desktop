import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';
import { useSettingsStore, updateSettings } from '../../store';
export function SecondsSettingItem() { const value = useSettingsStore(state => state.values.clock.seconds); return <SettingsRow title={copy.clockSeconds}><SettingsSwitch label={copy.clockSeconds} checked={value} onChange={value => void updateSettings({ clock: { seconds: value } })} /></SettingsRow>; }
