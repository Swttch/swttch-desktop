import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';

export function ConfirmCloseSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.confirmClose} description={copy.confirmCloseDescription}><SettingsSelect label={copy.confirmClose} value={copy.pending} options={[]} disabled onChange={() => {}} /></SettingsRow>; }
