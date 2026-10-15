import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsSection } from '../../../SettingsControls';
import { MemberAccountSettingItem } from './MemberAccountSettingItem';
import { AgentAccountSettingItem } from './AgentAccountSettingItem';
export function MemberSection() { return <SettingsSection title={copy.scordiMember}><MemberAccountSettingItem /><AgentAccountSettingItem /></SettingsSection>; }
