import { useRef } from 'react';
import { settingsCopy as copy } from '../../src/locales/settings.ko.mjs';
import { PATH } from './routes';
import { Dropdown } from './Dropdown';
import { SettingsIcon } from './SettingsIcon';
import { shortcutLabel } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';

export function AppAccountMenu({ onSettings, onShortcuts }: { onSettings: (path?: string) => void; onShortcuts: () => void }) {
  const close = useRef<(() => void) | null>(null);
  const closeHelp = useRef<(() => void) | null>(null);
  const action = (callback: () => void) => { closeHelp.current?.(); close.current?.(); callback(); };
  const help = <section aria-label={copy.help} className="account-menu-panel account-help-panel">
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="gift" /><span>{copy.whatsNew}</span></button>
    <div className="account-menu-divider" />
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="computer" /><span>{copy.mobileSettings}</span></button>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="browser" /><span>{copy.chromeSettings}</span></button>
    <button type="button" className="account-menu-row" onClick={() => action(onShortcuts)}><SettingsIcon kind="keyboard" /><span>{copy.shortcuts}</span></button>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="info" /><span>{copy.userGuide}</span></button>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="shield" /><span>{copy.privacyCenter}</span><SettingsIcon kind="external" className="ml-auto text-muted" /></button>
  </section>;
  return <Dropdown placement="right-end" closeRef={close} onClose={() => closeHelp.current?.()} content={<section aria-label={copy.accountMenu} className="account-menu-panel">
    <button type="button" className="account-profile" onClick={() => action(() => onSettings(PATH.ACCOUNT_SETTINGS))}><span className="account-avatar">S</span><span className="min-w-0 text-left"><strong className="block truncate font-medium">{copy.appAccount}</strong><span className="block text-muted">{copy.notSignedIn}</span></span></button>
    <div className="account-menu-divider" />
    <button type="button" className="account-menu-row" onClick={() => action(() => onSettings(PATH.SETTINGS_PLAN))}><SettingsIcon kind="gauge" /><span>{copy.planManagement}</span></button>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="pet" /><span>{copy.showPet}</span></button>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="invite" /><span>{copy.inviteFriends}</span></button>
    <button type="button" className="account-menu-row" onClick={() => action(() => onSettings(PATH.SETTINGS_GENERAL))}><SettingsIcon /><span>{copy.settings}</span><kbd className="shortcut-keys ml-auto">{shortcutLabel('settings', macShortcuts, browserShortcuts)}</kbd></button>
    <div className="account-menu-divider" />
    <div className="account-submenu"><Dropdown closeRef={closeHelp} submenu placement="right-end" content={help}><button type="button" className="account-menu-row"><SettingsIcon kind="plugin" /><span>{copy.help}</span><SettingsIcon kind="chevron" className="ml-auto text-muted" /></button></Dropdown></div>
    <button type="button" disabled className="account-menu-row"><SettingsIcon kind="logout" /><span>{copy.logout}</span></button>
  </section>}><button type="button" className="account-rail-button" aria-label={copy.appAccount} aria-expanded="false"><span className="account-avatar">S</span></button></Dropdown>;
}
