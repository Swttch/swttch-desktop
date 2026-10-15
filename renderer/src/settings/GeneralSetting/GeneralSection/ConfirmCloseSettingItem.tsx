import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';

export function ConfirmCloseSettingItem() { return <SettingsRow pending title={copy.confirmClose} description={copy.confirmCloseDescription}><SettingsSelect label={copy.confirmClose} value={copy.pending} options={[]} disabled onChange={() => {}} /></SettingsRow>; }
