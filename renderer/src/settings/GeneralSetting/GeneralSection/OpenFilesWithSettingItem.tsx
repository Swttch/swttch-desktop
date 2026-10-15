import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';

export function OpenFilesWithSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.openFilesWith} description={copy.openFilesWithDescription}><SettingsSelect label={copy.openFilesWith} value={copy.systemDefault} options={[]} disabled onChange={() => {}} /></SettingsRow>; }
