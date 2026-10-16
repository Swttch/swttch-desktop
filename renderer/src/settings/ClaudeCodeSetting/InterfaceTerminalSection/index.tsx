import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { RespectGitignoreSettingItem } from './RespectGitignoreSettingItem';
import { FileSuggestionSettingItem } from './FileSuggestionSettingItem';
import { SpinnerVerbsSettingItem } from './SpinnerVerbsSettingItem';
import { VoiceEnabledSettingItem } from './VoiceEnabledSettingItem';
export function InterfaceTerminalSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicInterfaceTerminal}><RespectGitignoreSettingItem /><FileSuggestionSettingItem /><SpinnerVerbsSettingItem /><VoiceEnabledSettingItem /></SettingsSection>;
}
