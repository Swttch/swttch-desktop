import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function BottomPanelSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.bottomPanel} description={copy.bottomPanelDescription}><SettingsSwitch label={copy.bottomPanel} disabled checked /></SettingsRow>; }
