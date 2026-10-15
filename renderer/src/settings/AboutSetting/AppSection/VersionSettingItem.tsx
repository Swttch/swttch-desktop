import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';
declare const __SWTTCH_VERSION__: string;
export function VersionSettingItem() { return <SettingsRow title={copy.version}><span className="text-muted">{__SWTTCH_VERSION__}</span></SettingsRow>; }
