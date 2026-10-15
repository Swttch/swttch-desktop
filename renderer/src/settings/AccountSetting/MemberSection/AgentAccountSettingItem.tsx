import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';
import { useRouter } from '../../../router';
import { PATH } from '../../../routes';
export function AgentAccountSettingItem() { const router = useRouter(); return <SettingsRow title={copy.agentAccounts} description={copy.agentAccountsDescription}><button className="settings-select" onClick={() => router.push(PATH.SETTINGS_AGENT)}>{copy.openAgentSettings}</button></SettingsRow>; }
