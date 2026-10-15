import { t, useShellTranslation } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';
import { entries } from '../../../DesktopHelp';
import { shortcutLabel } from '../../../../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from '../../../shortcut-platform';
export function PanelLeftSettingItem() { useShellTranslation(); const entry = entries.find(entry => entry.command === 'panel-left')!; return <SettingsRow title={t(entry.label)}><kbd className="settings-shortcut">{shortcutLabel(entry.command, macShortcuts, browserShortcuts)}</kbd></SettingsRow>; }
