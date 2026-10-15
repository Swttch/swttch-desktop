import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';

export function MemberAccountSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.accountPending} description={copy.accountPendingDescription} />; }
