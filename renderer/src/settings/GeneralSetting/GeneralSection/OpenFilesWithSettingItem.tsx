import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';

export function OpenFilesWithSettingItem() { return <SettingsRow pending title={copy.openFilesWith} description={copy.openFilesWithDescription}><SettingsSelect label={copy.openFilesWith} value={copy.systemDefault} options={[]} disabled onChange={() => {}} /></SettingsRow>; }
