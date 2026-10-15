import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { DefaultFolderSettingItem } from './DefaultFolderSettingItem';
import { OpenFilesWithSettingItem } from './OpenFilesWithSettingItem';
import { DirectionSettingItem } from './DirectionSettingItem';
import { LanguageSettingItem } from './LanguageSettingItem';
import { MenuBarSettingItem } from './MenuBarSettingItem';
import { ConfirmCloseSettingItem } from './ConfirmCloseSettingItem';
import { OverviewDefaultSettingItem } from './OverviewDefaultSettingItem';
import { BottomPanelSettingItem } from './BottomPanelSettingItem';
export function GeneralSection() { const copy = useSettingsCopy(); return <SettingsSection title={copy.general}><DefaultFolderSettingItem /><OpenFilesWithSettingItem /><LanguageSettingItem /><DirectionSettingItem /><MenuBarSettingItem /><ConfirmCloseSettingItem /><OverviewDefaultSettingItem /><BottomPanelSettingItem /></SettingsSection>; }
