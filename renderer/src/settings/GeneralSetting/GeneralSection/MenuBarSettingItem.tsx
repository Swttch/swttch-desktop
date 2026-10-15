import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function MenuBarSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.menuBar} description={copy.menuBarDescription}><SettingsSwitch label={copy.menuBar} disabled /></SettingsRow>; }
