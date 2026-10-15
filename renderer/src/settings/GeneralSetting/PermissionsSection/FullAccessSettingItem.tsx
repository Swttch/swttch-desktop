import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function FullAccessSettingItem() { return <SettingsRow pending title={copy.fullAccess} description={copy.fullAccessDescription}><SettingsSwitch label={copy.fullAccess} disabled /></SettingsRow>; }
