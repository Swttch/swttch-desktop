import { GeneralSetting } from './settings/GeneralSetting';
import { ShortcutsSetting } from './settings/ShortcutsSetting';
import { AccountSetting } from './settings/AccountSetting';
import { PlanSetting } from './settings/PlanSetting';
import { AboutSetting } from './settings/AboutSetting';
import { AgentSetting } from './settings/AgentSetting';
import { settingsCopy as copy } from '../../src/locales/settings.ko.mjs';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { settingsItems, findSettings, resolveSettingsPath } from '../../src/settings-navigation.mjs';
import { PATH } from './routes';
import { useRouter } from './router';
import { SettingsIcon } from './SettingsIcon';
export { AppAccountMenu } from './AppAccountMenu';

export function SettingsSidebar() {
  const location = useLocation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const items = findSettings(query);
  return <div className="settings-sidebar"><h1>{copy.settings}</h1><label className="settings-search"><SettingsIcon kind="search" /><input type="search" aria-label={copy.search} placeholder={copy.searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} /></label><nav aria-label={copy.navigation}>{[...new Set(items.map(item => item.group))].map(group => <div key={group} className="settings-menu-group"><h2>{group}</h2>{items.filter(item => item.group === group).map(item => <button key={item.label} type="button" disabled={item.disabled} aria-description={item.disabled ? copy.pending : undefined} aria-current={location.pathname === item.path ? 'page' : undefined} className={`settings-menu-row ${location.pathname === item.path ? 'is-selected' : ''}`} onClick={() => { if (item.path && !item.disabled) router.push(item.path); }}><SettingsIcon kind={item.icon} /><span>{item.label}</span>{item.icon === 'user' && <SettingsIcon kind="external" className="ml-auto text-muted" />}</button>)}</div>)}</nav>{items.length === 0 && <p role="status" className="px-2 py-6 text-sm text-muted">{copy.noResults}</p>}</div>;
}

export function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = resolveSettingsPath(location.pathname);
  const item = settingsItems.find(item => item.path === path)!;
  useEffect(() => { if (path !== location.pathname) void navigate(path, { replace: true }); try { localStorage.setItem('swttch-last-settings-page', path); } catch { /* Navigation remains available without storage. */ } }, [path, location.pathname, navigate]);
  if (path === PATH.SETTINGS_AGENT) return <AgentSetting />;
  return <main key={path} aria-label={item.label} className="settings-main"><div className="settings-content"><h2>{item.label}</h2>
    {path === PATH.SETTINGS_GENERAL && <GeneralSetting />}
    {path === PATH.SETTINGS_SHORTCUTS && <ShortcutsSetting />}
    {path === PATH.ACCOUNT_SETTINGS && <AccountSetting />}
    {path === PATH.SETTINGS_PLAN && <PlanSetting />}
    {path === PATH.SETTINGS_ABOUT && <AboutSetting />}
  </div></main>;
}
