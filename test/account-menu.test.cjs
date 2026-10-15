const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require(require.resolve('jsdom', { paths: [join(__dirname, '../../../webview')] }));

function loadComponent(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = new Module(file, module);
  loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file)); cache.set(file, loaded);
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => name.endsWith('/i18n') ? require('./i18n-fixture.cjs') : name.startsWith('.') && !name.endsWith('.mjs') ? loadComponent(join(dirname(file), name + (existsSync(join(dirname(file), name + '.tsx')) ? '.tsx' : '.ts')), cache) : originalRequire(name);
  loaded._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, file);
  return loaded.exports;
}

test('account menu opens on click, has no hover tooltip, and Escape dismisses it', async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/settings/general', pretendToBeVisual: true });
  const names = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Node', 'ShadowRoot', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: typeof dom.window[name] === 'function' && ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await React.act(() => root.unmount()); dom.window.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const { AppAccountMenu } = loadComponent(join(__dirname, '../renderer/src/AppAccountMenu.tsx'));
  const destinations = [];
  let shortcutsOpened = 0;
  await React.act(() => root.render(React.createElement(AppAccountMenu, { onSettings: path => destinations.push(path), onShortcuts: () => shortcutsOpened++ })));
  const button = document.querySelector('button[aria-label="Swttch 계정"]');
  await React.act(async () => {
    button.parentElement.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: false }));
    button.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: false }));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  assert.equal(button.getAttribute('aria-expanded'), 'false', 'hover must not open the account menu');
  assert.equal(document.querySelector('[data-tippy-root]'), null, 'hover must not show an account tooltip');
  await React.act(() => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.equal(button.getAttribute('aria-expanded'), 'true', 'click must open the account menu');
  assert.ok(document.querySelector('[data-tippy-root] .account-menu-panel'));
  const menuButton = label => [...document.querySelectorAll('.account-menu-row')].find(el => el.textContent.trim() === label || (label === '설정' && el.textContent.startsWith(label)));
  await React.act(() => menuButton('도움말').click());
  assert.equal(menuButton('사용자 가이드').disabled, true, 'an unavailable user guide must be disabled');
  await React.act(() => menuButton('키보드 단축키').dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true })));
  assert.equal(button.getAttribute('aria-expanded'), 'true', 'pressing a submenu action must not dismiss its parent before click');
  await React.act(() => menuButton('키보드 단축키').click());
  assert.equal(shortcutsOpened, 1, 'shortcuts opens its modal action');
  assert.equal(destinations.length, 0, 'shortcuts must not navigate away');
  await React.act(() => button.click());
  await React.act(() => menuButton('설정').click());
  assert.equal(destinations.at(-1), '/settings/general', 'settings always opens General');
  await React.act(() => button.click());
  await React.act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('a delayed tooltip cannot open after its sidebar content is detached', async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/settings/general', pretendToBeVisual: true });
  const names = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Node', 'ShadowRoot', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: typeof dom.window[name] === 'function' && ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await React.act(() => root.unmount()); dom.window.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const { Tooltip } = loadComponent(join(__dirname, '../renderer/src/Tooltip.tsx'));
  await React.act(() => root.render(React.createElement(Tooltip, { content: '/project/path', delay: 20 }, React.createElement('button', null, 'Project'))));
  const reference = document.querySelector('.tooltip-anchor');
  await React.act(async () => {
    reference.dispatchEvent(new dom.window.MouseEvent('mouseenter'));
    document.getElementById('root').remove();
    await new Promise(resolve => setTimeout(resolve, 40));
  });
  assert.ok(!document.querySelector('.tippy-box[data-state="visible"]'), 'hidden sidebar references must not leave a path tooltip at the viewport origin');
});
