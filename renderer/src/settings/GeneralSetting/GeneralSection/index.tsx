import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsSection } from '../../../SettingsControls';
import { DefaultFolderSettingItem } from './DefaultFolderSettingItem';
import { OpenFilesWithSettingItem } from './OpenFilesWithSettingItem';
import { LanguageSettingItem } from './LanguageSettingItem';
import { MenuBarSettingItem } from './MenuBarSettingItem';
import { ConfirmCloseSettingItem } from './ConfirmCloseSettingItem';
import { OverviewDefaultSettingItem } from './OverviewDefaultSettingItem';
import { BottomPanelSettingItem } from './BottomPanelSettingItem';
export function GeneralSection() { return <SettingsSection title={copy.general}><DefaultFolderSettingItem /><OpenFilesWithSettingItem /><LanguageSettingItem /><MenuBarSettingItem /><ConfirmCloseSettingItem /><OverviewDefaultSettingItem /><BottomPanelSettingItem /></SettingsSection>; }
