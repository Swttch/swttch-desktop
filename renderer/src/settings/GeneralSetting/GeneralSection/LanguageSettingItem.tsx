import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSelect } from '../../../SettingsControls';

export function LanguageSettingItem() { return <SettingsRow pending title={copy.language} description={copy.languageDescription}><SettingsSelect label={copy.language} value={copy.korean} options={[]} disabled onChange={() => {}} /></SettingsRow>; }
