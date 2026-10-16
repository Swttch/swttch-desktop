const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require(require.resolve('jsdom', { paths: [join(__dirname, '../../../webview')] }));

test('provider text fields save only changed values on blur, without a save button', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const names = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Node'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await React.act(() => root.unmount()); dom.window.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; for (const [name, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const saves = [];
  const file = join(__dirname, '../renderer/src/settings/ClaudeCodeSetting/ProviderSettingControl.tsx');
  const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id === './store' ? { useProviderField: () => ({ value: 'sonnet', scope: 'project', inherited: true, pending: false, save: async value => { saves.push(value); } }) } : id.endsWith('/Tooltip') ? { Tooltip: ({ children }) => children } : id.endsWith('/i18n') ? require('./i18n-fixture.cjs') : id.endsWith('/SettingsControls') ? { SettingsRow: ({ title, badge, description, settingPath, children }) => React.createElement('div', null, React.createElement('header', null, title, badge), React.createElement('p', null, description), React.createElement('code', null, settingPath), children) } : original(id);
  loaded._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, file);
  await React.act(() => root.render(React.createElement(loaded.exports.ProviderSettingControl, { settingKey: 'model', title: 'Model' })));
  assert.ok(document.querySelector('header [role=img]'), 'inheritance belongs beside the title');
  assert.equal(document.querySelector('p').textContent.includes('전역 설정 상속 중'), false, 'inheritance is not appended to the description');
  assert.equal(document.querySelector('code').textContent, '$.model');
  const input = document.querySelector('input');
  await React.act(() => input.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
  assert.deepEqual(saves, []);
  await React.act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, 'opus');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.deepEqual(saves, [], 'typing must not write');
  await React.act(() => input.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
  assert.deepEqual(saves, ['opus']);
  assert.equal(document.querySelector('button[type="submit"]'), null);
  await React.act(() => input.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
  assert.deepEqual(saves, ['opus'], 'repeated blur without another edit must not duplicate writes');
  await React.act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await React.act(() => input.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
  assert.deepEqual(saves, ['opus', null], 'clearing a field resets the scoped value');
});
