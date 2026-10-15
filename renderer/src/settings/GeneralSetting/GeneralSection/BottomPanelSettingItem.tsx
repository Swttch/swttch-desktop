import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function BottomPanelSettingItem() { return <SettingsRow pending title={copy.bottomPanel} description={copy.bottomPanelDescription}><SettingsSwitch label={copy.bottomPanel} disabled checked /></SettingsRow>; }
