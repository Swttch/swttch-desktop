import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function MenuBarSettingItem() { return <SettingsRow pending title={copy.menuBar} description={copy.menuBarDescription}><SettingsSwitch label={copy.menuBar} disabled /></SettingsRow>; }
