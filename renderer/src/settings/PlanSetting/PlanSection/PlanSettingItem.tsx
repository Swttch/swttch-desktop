import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow } from '../../../SettingsControls';

export function PlanSettingItem() { return <SettingsRow pending title={copy.planPending} description={copy.planPendingDescription} />; }
