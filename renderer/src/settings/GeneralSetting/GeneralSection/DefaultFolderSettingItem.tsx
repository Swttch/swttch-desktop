import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';

export function DefaultFolderSettingItem() { return <SettingsRow pending title={copy.defaultFolder} description={copy.defaultFolderDescription}><span className="text-sm text-muted">{copy.notSet}</span><button type="button" disabled className="settings-select">{copy.change}</button></SettingsRow>; }
