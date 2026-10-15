import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';

export function MemberAccountSettingItem() { return <SettingsRow pending title={copy.accountPending} description={copy.accountPendingDescription} />; }
