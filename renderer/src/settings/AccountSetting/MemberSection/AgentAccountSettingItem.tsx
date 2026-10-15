import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';
import { useRouter } from '../../../router';
import { PATH } from '../../../routes';
export function AgentAccountSettingItem() { const copy = useSettingsCopy(); const router = useRouter(); return <SettingsRow title={copy.agentAccounts} description={copy.agentAccountsDescription}><button className="settings-select" onClick={() => router.push(PATH.SETTINGS_AGENT)}>{copy.openAgentSettings}</button></SettingsRow>; }
