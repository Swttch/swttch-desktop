const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require(require.resolve('jsdom', { paths: [join(__dirname, '../../../webview')] }));

// Keep shell routing, state and resize behavior real; isolate unrelated application data and views.
async function loadApp() {
  const { PATH } = await import('../src/paths.mjs');
  const shortcuts = await import('../src/desktop-shortcuts.mjs');
  const navigation = await import('../src/settings-navigation.mjs');
  const copy = await import('../src/locales/settings.ko.mjs');
  const { createDeviceSettingsStore } = await import('../src/device-settings-store.mjs');
  const { defaultSettings, mergeSettings } = await import('../src/device-settings.mjs');
  const { useStore } = require('zustand');
  let record = { revision: 1, values: mergeSettings(defaultSettings(), { sidebar: { width: 310 } }) };
  const settingsStore = createDeviceSettingsStore({ load: async () => record, save: async patch => (record = { revision: record.revision + 1, values: mergeSettings(record.values, patch) }), onError: error => { throw error; } });
  const settingsModule = { settingsStore, useSettingsStore: selector => useStore(settingsStore, selector), updateSettings: patch => settingsStore.getState().update(patch) };
  const actions = React.createContext(null);
  const actionsModule = { SettingsActionsContext: actions, useSettingsActions: () => React.useContext(actions) };
  const noop = () => null;
  const children = ({ children }) => children;
  const mocks = {
    './api': { desktopApi: { subscribe: () => () => {} } },
    './desktop': { DesktopPhase: { Starting: 'starting', Ready: 'ready', Chat: 'chat', Error: 'error' } },
    './query-client': { queryClient: { invalidateQueries() {} }, QUERY_KEY: {} },
    './projects/projectSort': { readProjectSort: () => 'manual', sortProjects: rows => rows, SortOrder: {} },
    './SettingsPage': { SettingsPage: noop, SettingsSidebar: () => React.createElement('h1', null, '설정'), AppAccountMenu: noop },
    './Tooltip': { Tooltip: children, dismissTooltips() {} },
    './routes': { PATH },
    './settings/store': settingsModule,
    './settings/actions': actionsModule,
    '../actions': actionsModule,
    '../../api': { desktopApi: {} },
    '../../shortcut-platform': { macShortcuts: true, browserShortcuts: false },
    '../../../../src/locales/settings.ko.mjs': copy,
    '../../../../src/desktop-shortcuts.mjs': shortcuts,
    './shortcut-platform': { macShortcuts: true, browserShortcuts: false },
    '../../src/desktop-shortcuts.mjs': shortcuts,
    '../../src/settings-navigation.mjs': navigation,
    '../../src/locales/settings.ko.mjs': copy,
    '@tanstack/react-query': { useQuery: () => ({}), useMutation: () => ({ data: { url: 'about:blank' }, mutate() {} }) },
    'react-hot-toast': { __esModule: true, default: noop, Toaster: noop },
  };
  const cache = new Map();
  function load(name) {
    const file = join(__dirname, '../renderer/src', name + (name === 'router' ? '.ts' : '.tsx'));
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = new Module(file, module);
    loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file)); cache.set(file, loaded);
    const original = loaded.require.bind(loaded);
    loaded.require = id => {
      if (id.endsWith('/i18n')) return require('./i18n-fixture.cjs');
      if (mocks[id]) return mocks[id];
      if (['./router', './WorkPage', './SidebarResize', './FloatingSidebar'].includes(id)) return load(id.slice(2));
      if (id.startsWith('.')) return new Proxy({}, { get: (_, key) => key === 'SidebarSectionName' ? {} : noop });
      return original(id);
    };
    loaded._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
    return loaded.exports;
  }
  return { App: load('App').App, AgentSetting: load('settings/AgentSetting/index').AgentSetting, actions, settingsStore };
}

test('settings shares the shell collapse shortcut, resize control and saved width with home', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/settings/account', pretendToBeVisual: true });
  const names = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Node', 'ShadowRoot', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const { MemoryRouter } = require('react-router');
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await React.act(() => root.unmount()); dom.window.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  localStorage.setItem('swttch-sidebar-width', '310');
  const { App, AgentSetting, actions, settingsStore } = await loadApp();
  await React.act(() => root.render(React.createElement(MemoryRouter, { initialEntries: ['/settings/account'] }, React.createElement(App))));
  const toggle = document.querySelector('button[aria-label="사이드바 표시/숨기기"]');
  assert.ok(toggle, 'settings must expose the same sidebar toggle as home');
  assert.equal(document.querySelector('.app').style.getPropertyValue('--sidebar-width'), '310px');
  const sidebar = document.getElementById('sidebar');
  await React.act(() => toggle.click());
  assert.equal(sidebar.getAttribute('aria-hidden'), 'true');
  await React.act(() => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'S', shiftKey: true, metaKey: true, bubbles: true })));
  assert.equal(sidebar.getAttribute('aria-hidden'), 'false');
  const handle = sidebar.querySelector('[role="separator"]');
  assert.ok(handle, 'settings must retain the shared resize handle');
  await React.act(() => handle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.equal(settingsStore.getState().values.sidebar.width, 324);
  await React.act(() => document.querySelector('button[aria-label="홈"]').click());
  assert.equal(document.getElementById('sidebar'), sidebar, 'route changes retain the same shell sidebar');
  assert.equal(document.querySelector('.app').style.getPropertyValue('--sidebar-width'), '324px');
  await React.act(() => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 's', shiftKey: true, ctrlKey: true, bubbles: true })));
  assert.equal(sidebar.getAttribute('aria-hidden'), 'true');
  let embeddedToggles = 0;
  await React.act(() => root.render(React.createElement(MemoryRouter, { key: 'agent', initialEntries: ['/settings/agent'] }, React.createElement(actions.Provider, { value: { onReturn() {}, onHelp() {}, onSidebar() { embeddedToggles++; } } }, React.createElement(AgentSetting)))));
  const frame = document.querySelector('iframe');
  await React.act(() => frame.dispatchEvent(new dom.window.Event('load')));
  await React.act(() => frame.contentWindow.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 's', code: 'KeyS', shiftKey: true, metaKey: true, bubbles: true })));
  assert.equal(embeddedToggles, 1, 'sidebar shortcut must also work while agent settings iframe has focus');
});
