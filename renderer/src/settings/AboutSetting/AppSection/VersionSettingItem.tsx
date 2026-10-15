import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';
declare const __SWTTCH_VERSION__: string;
export function VersionSettingItem() { const copy = useSettingsCopy(); return <SettingsRow title={copy.version}><span className="text-muted">{__SWTTCH_VERSION__}</span></SettingsRow>; }
