import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function BasicPermissionSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.basicPermission} description={copy.basicPermissionDescription}><SettingsSwitch label={copy.basicPermission} disabled /></SettingsRow>; }
