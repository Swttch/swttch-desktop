import { useLocation } from 'react-router';
import { useRouter } from '../../router';
import { PATH } from '../../routes';
import { useSettingsCopy } from '../../i18n';
import { ProviderScope } from '../../../../src/provider-settings.mjs';
import { useProviderScope, useProviderSettings } from './store';
import { SettingsLoading } from '../SettingsLoading';
import { ScopeControl } from './ScopeControl';
import { ModelResponsesSection } from './ModelResponsesSection';
import { MemoryContextSection } from './MemoryContextSection';
import { InterfaceTerminalSection } from './InterfaceTerminalSection';
import { PermissionsSection } from './PermissionsSection';
import { SandboxSection } from './SandboxSection';
import { ToolsSection } from './ToolsSection';
import { HooksAutomationSection } from './HooksAutomationSection';
import { McpSection } from './McpSection';
import { PluginsSkillsSection } from './PluginsSkillsSection';
import { AgentsSessionsWorktreesSection } from './AgentsSessionsWorktreesSection';
import { AuthenticationProvidersSection } from './AuthenticationProvidersSection';
import { PrivacyTelemetrySection } from './PrivacyTelemetrySection';
import { RemoteDesktopNotificationsSection } from './RemoteDesktopNotificationsSection';
import { EnterpriseManagedSection } from './EnterpriseManagedSection';
import { GitAttributionSection } from './GitAttributionSection';
import { UpdatesVersioningSection } from './UpdatesVersioningSection';
import { GlobalConfigSection } from './GlobalConfigSection';
const topics = [
  {id:'model-and-responses',titleKey:'topicModelResponses',Component:ModelResponsesSection},
  {id:'memory-and-context',titleKey:'topicMemoryContext',Component:MemoryContextSection},
  {id:'interface-and-terminal',titleKey:'topicInterfaceTerminal',Component:InterfaceTerminalSection},
  {id:'permission-settings',titleKey:'topicPermissions',Component:PermissionsSection},
  {id:'sandbox-settings',titleKey:'topicSandbox',Component:SandboxSection},
  {id:'tools',titleKey:'topicTools',Component:ToolsSection},
  {id:'hooks-and-automation',titleKey:'topicHooksAutomation',Component:HooksAutomationSection},
  {id:'mcp',titleKey:'topicMcp',Component:McpSection},
  {id:'plugins-and-skills',titleKey:'topicPluginsSkills',Component:PluginsSkillsSection},
  {id:'agents-sessions-and-worktrees',titleKey:'topicAgentsSessionsWorktrees',Component:AgentsSessionsWorktreesSection},
  {id:'authentication-and-providers',titleKey:'topicAuthenticationProviders',Component:AuthenticationProvidersSection},
  {id:'privacy-and-telemetry',titleKey:'topicPrivacyTelemetry',Component:PrivacyTelemetrySection},
  {id:'remote-desktop-and-notifications',titleKey:'topicRemoteDesktopNotifications',Component:RemoteDesktopNotificationsSection},
  {id:'enterprise-and-managed-settings',titleKey:'topicEnterpriseManaged',Component:EnterpriseManagedSection},
  {id:'git-and-attribution',titleKey:'topicGitAttribution',Component:GitAttributionSection},
  {id:'updates-and-versioning',titleKey:'topicUpdatesVersioning',Component:UpdatesVersioningSection},
  {id:'global-config-settings',titleKey:'topicGlobalConfig',Component:GlobalConfigSection},
] as const;
export function ClaudeCodeSetting() {
  const copy = useSettingsCopy();
  const location = useLocation();
  const router = useRouter();
  const scope = useProviderScope(state => state.scope);
  const projectId = useProviderScope(state => state.projectId);
  const query = useProviderSettings();
  const selectedId = new URLSearchParams(location.search).get('topic');
  const topic = topics.find(topic => topic.id === selectedId) ?? topics[0];
  const SelectedSection = topic.Component;
  const selectTopic = (id: string) => {
    const params = new URLSearchParams(location.search);
    params.set('topic',id);
    router.push(PATH.SETTINGS_CLAUDE_CODE + '?' + params.toString());
  };
  return <><div className="provider-scope-header"><ScopeControl /></div><div className="provider-settings-layout">
    <nav className="provider-topic-nav" aria-label={copy.providerTopics}>{topics.map(item => <button type="button" key={item.id} data-topic={item.id} aria-current={topic.id === item.id ? 'page' : undefined} className={`provider-topic-link ${topic.id === item.id ? 'is-selected' : ''}`} onClick={() => selectTopic(item.id)}>{copy[item.titleKey]}</button>)}</nav>
    <div role="region" aria-label={copy[topic.titleKey]} tabIndex={0} className="provider-topic-content">
      {scope === ProviderScope.Project && !projectId ? <p role="status" className="text-muted">{copy.chooseProject}</p> : query.error && !query.data ? <div role="alert"><p>{query.error.message}</p><button type="button" className="settings-select mt-3" onClick={() => { void query.refetch(); }}>{copy.retry}</button></div> : !query.data ? <SettingsLoading label={copy.providerLoading} /> : <div key={`${scope}:${projectId}:${topic.id}`}><SelectedSection /></div>}
    </div>
  </div></>;
}
