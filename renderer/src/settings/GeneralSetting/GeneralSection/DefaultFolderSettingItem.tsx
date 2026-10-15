import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';

export function DefaultFolderSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.defaultFolder} description={copy.defaultFolderDescription}><span className="text-sm text-muted">{copy.notSet}</span><button type="button" disabled className="settings-select">{copy.change}</button></SettingsRow>; }
