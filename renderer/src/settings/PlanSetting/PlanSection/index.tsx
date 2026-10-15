import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsSection } from '../../../SettingsControls';
import { PlanSettingItem } from './PlanSettingItem';
export function PlanSection() { return <SettingsSection title={copy.plan}><PlanSettingItem /></SettingsSection>; }
