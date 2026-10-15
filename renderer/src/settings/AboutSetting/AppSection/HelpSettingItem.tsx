import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';
import { useSettingsActions } from '../../actions';
export function HelpSettingItem() { const copy = useSettingsCopy(); const { onHelp } = useSettingsActions(); return <SettingsRow title={copy.help} description={copy.helpDescription}><button className="settings-select" onClick={onHelp}>{copy.openHelp}</button></SettingsRow>; }
