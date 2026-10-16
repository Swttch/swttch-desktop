import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function CheckpointingSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="fileCheckpointingEnabled" title={copy.checkpointing} description={copy.checkpointingDescription} kind="switch" fallback={true} />;
}
