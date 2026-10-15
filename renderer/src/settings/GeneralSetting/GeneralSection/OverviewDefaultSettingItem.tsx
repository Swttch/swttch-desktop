import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function OverviewDefaultSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.overviewDefault} description={copy.overviewDescription}><SettingsSwitch label={copy.overviewDefault} disabled /></SettingsRow>; }
