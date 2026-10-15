import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { MemberAccountSettingItem } from './MemberAccountSettingItem';
import { AgentAccountSettingItem } from './AgentAccountSettingItem';
export function MemberSection() { const copy = useSettingsCopy(); return <SettingsSection title={copy.scordiMember}><MemberAccountSettingItem /><AgentAccountSettingItem /></SettingsSection>; }
