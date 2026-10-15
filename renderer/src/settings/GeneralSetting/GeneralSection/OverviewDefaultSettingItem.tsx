import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function OverviewDefaultSettingItem() { return <SettingsRow pending title={copy.overviewDefault} description={copy.overviewDescription}><SettingsSwitch label={copy.overviewDefault} disabled /></SettingsRow>; }
