import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';
import { useSettingsActions } from '../../actions';
export function HelpSettingItem() { const { onHelp } = useSettingsActions(); return <SettingsRow title={copy.help} description={copy.helpDescription}><button className="settings-select" onClick={onHelp}>{copy.openHelp}</button></SettingsRow>; }
