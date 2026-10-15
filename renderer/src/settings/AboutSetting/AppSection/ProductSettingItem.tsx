import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';

export function ProductSettingItem() { const copy = useSettingsCopy(); return <SettingsRow title="Swttch" description={copy.productDescription} />; }
