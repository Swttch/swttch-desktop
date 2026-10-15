import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { PlanSettingItem } from './PlanSettingItem';
export function PlanSection() { const copy = useSettingsCopy(); return <SettingsSection title={copy.plan}><PlanSettingItem /></SettingsSection>; }
