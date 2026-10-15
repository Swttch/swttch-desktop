import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function FullAccessSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.fullAccess} description={copy.fullAccessDescription}><SettingsSwitch label={copy.fullAccess} disabled /></SettingsRow>; }
