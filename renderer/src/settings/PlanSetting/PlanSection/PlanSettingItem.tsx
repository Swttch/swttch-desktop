import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';

export function PlanSettingItem() { const copy = useSettingsCopy(); return <SettingsRow pending title={copy.planPending} description={copy.planPendingDescription} />; }
