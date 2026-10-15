import { SettingsSection } from '../../../SettingsControls';
import { ProductSettingItem } from './ProductSettingItem';
import { VersionSettingItem } from './VersionSettingItem';
import { HelpSettingItem } from './HelpSettingItem';
export function AppSection() { return <SettingsSection title="Swttch Desktop"><ProductSettingItem /><VersionSettingItem /><HelpSettingItem /></SettingsSection>; }
