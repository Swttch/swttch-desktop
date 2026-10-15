import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';

export function ProductSettingItem() { return <SettingsRow title="Swttch" description={copy.productDescription} />; }
