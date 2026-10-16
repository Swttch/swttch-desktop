import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { ModelSettingItem } from './ModelSettingItem';
import { EffortSettingItem } from './EffortSettingItem';
import { ResponseLanguageSettingItem } from './ResponseLanguageSettingItem';
import { ThinkingSettingItem } from './ThinkingSettingItem';
import { FastModeSettingItem } from './FastModeSettingItem';
import { ThinkingSummariesSettingItem } from './ThinkingSummariesSettingItem';
export function ModelResponsesSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicModelResponses}><ModelSettingItem /><EffortSettingItem /><ResponseLanguageSettingItem /><ThinkingSettingItem /><FastModeSettingItem /><ThinkingSummariesSettingItem /></SettingsSection>;
}
