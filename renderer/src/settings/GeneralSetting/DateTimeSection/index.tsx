import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { DisplaySettingItem } from './DisplaySettingItem';
import { HourCycleSettingItem } from './HourCycleSettingItem';
import { SecondsSettingItem } from './SecondsSettingItem';
import { DateFormatSettingItem } from './DateFormatSettingItem';
import { WeekdaySettingItem } from './WeekdaySettingItem';
import { TimeZoneSettingItem } from './TimeZoneSettingItem';
export function DateTimeSection() { const copy = useSettingsCopy(); return <SettingsSection title={copy.dateTime}><DisplaySettingItem /><HourCycleSettingItem /><SecondsSettingItem /><DateFormatSettingItem /><WeekdaySettingItem /><TimeZoneSettingItem /></SettingsSection>; }
