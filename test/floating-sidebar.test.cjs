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

test('floating sidebars reuse mounted content, match expanded width and remain interactive without changing pinned layout', { timeout: 10000 }, async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/settings/general', pretendToBeVisual: true });
  const names = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Node', 'ShadowRoot', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: typeof dom.window[name] === 'function' && ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await React.act(() => root.unmount()); dom.window.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const { FloatingSidebar } = loadComponent(join(__dirname, '../renderer/src/FloatingSidebar.tsx'));
  const { Dropdown } = loadComponent(join(__dirname, '../renderer/src/Dropdown.tsx'));
  let clicks = 0;
  function Harness({ hidden, current = 'home', routeKey = '/' }) {
    const home = React.useRef(null), projects = React.useRef(null), toggle = React.useRef(null);
    return React.createElement('div', { className: 'app' },
      React.createElement('nav', { className: 'activity-rail' }, React.createElement('button', { ref: home, id: 'home' }, 'Home'), React.createElement('button', { ref: projects, id: 'projects' }, 'Projects'), React.createElement('button', { ref: toggle, id: 'toggle' }, 'Toggle')),
      React.createElement('div', { className: 'shell-body' }),
      React.createElement('aside', { id: 'sidebar', inert: hidden, 'aria-hidden': hidden }, React.createElement(FloatingSidebar, { current, hidden, routeKey, width: 310, homeTrigger: home, toggleTrigger: toggle,
        homeContent: React.createElement('div', null, React.createElement('input', { 'aria-label': 'Project search', defaultValue: 'kept' }), React.createElement('button', { onClick: () => clicks++ }, 'Expand section'), React.createElement(Dropdown, { content: React.createElement('button', { id: 'nested-choice', onClick: () => clicks++ }, 'Choose action') }, React.createElement('button', { id: 'nested-menu' }, 'More actions'))),
        settingsContent: React.createElement('input', { 'aria-label': 'Settings search' }),
      })));
  }
  const finishTransitions = () => React.act(() => { for (const box of document.querySelectorAll('.tippy-box[data-state="hidden"]')) box.dispatchEvent(new dom.window.Event('transitionend', { bubbles: true })); });
  const render = async props => { await React.act(() => root.render(React.createElement(Harness, props))); await finishTransitions(); };
  const hover = id => React.act(async () => { document.getElementById(id).dispatchEvent(new dom.window.MouseEvent('mouseenter')); await new Promise(resolve => setTimeout(resolve, 150)); });
  const escape = () => React.act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await render({ hidden: false });
  const input = document.querySelector('input[aria-label="Project search"]');
  input.value = 'preserved draft';
  await hover('home');
  assert.ok(!document.querySelector('[data-tippy-root] .is-floating'), 'do not duplicate an already visible sidebar');
  await render({ hidden: true });
  await hover('projects');
  assert.ok(!document.querySelector('[data-tippy-root] .is-floating'), 'Projects must not open the Home sidebar when collapsed');
  await hover('home');
  const panel = document.querySelector('[data-tippy-root] [data-sidebar-kind="home"]');
  assert.ok(panel, 'a hidden sidebar must open by hovering its rail icon');
  assert.equal(panel.style.width, '310px');
  assert.equal(panel.querySelector('input'), input, 'reuse the original sidebar instead of mounting a preview copy');
  assert.equal(input.value, 'preserved draft');
  assert.equal(panel.closest('[inert]'), null, 'floating content must escape the inert collapsed sidebar');
  await React.act(async () => {
    document.getElementById('home').dispatchEvent(new dom.window.MouseEvent('mouseleave', { clientX: 900, clientY: 700 }));
    document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 900, clientY: 700, bubbles: true }));
    await new Promise(resolve => dom.window.requestAnimationFrame(() => dom.window.requestAnimationFrame(resolve)));
  });
  assert.equal(document.getElementById('home').getAttribute('aria-expanded'), 'false', 'leaving the interactive boundary starts dismissal without a debounce or hide delay');
  assert.ok(panel.closest('[data-tippy-root]'), 'keep the sidebar content mounted in its panel until the exit transition completes');
  await finishTransitions();
  assert.ok(input.closest('#sidebar'), 'return content to the pinned slot after the transition');
  await hover('home');
  assert.equal(document.getElementById('home').getAttribute('aria-expanded'), 'true', 're-entering opens the panel again');
  await React.act(() => panel.querySelector('button').click());
  assert.equal(clicks, 1);
  assert.equal(document.getElementById('sidebar').getAttribute('aria-hidden'), 'true', 'preview must not expand the pinned layout');
  await React.act(() => document.getElementById('nested-menu').click());
  assert.equal(document.getElementById('home').getAttribute('aria-expanded'), 'true', 'opening a sidebar child menu must retain its parent panel');
  await React.act(() => document.getElementById('nested-choice').click());
  assert.equal(clicks, 2);
  await escape();
  await finishTransitions();
  assert.equal(document.getElementById('home').getAttribute('aria-expanded'), 'false');
  await render({ hidden: false, current: 'settings', routeKey: '/settings/general' });
  for (const icon of ['home', 'projects', 'toggle']) {
    await hover(icon);
    assert.ok(!document.querySelector('[data-tippy-root] .is-floating'), 'no hover sidebar may open while settings is expanded: ' + icon);
  }
  assert.ok(document.querySelector('#sidebar input[aria-label="Settings search"]'));
  await render({ hidden: true, current: 'settings', routeKey: '/settings/account' });
  await hover('projects');
  assert.ok(!document.querySelector('[data-tippy-root] .is-floating'), 'Projects must not open Home while settings is collapsed');
  await hover('toggle');
  assert.ok(document.querySelector('[data-tippy-root] input[aria-label="Settings search"]'), 'the current-page toggle previews settings too');
  await escape();
  await render({ hidden: false });
  assert.equal(document.querySelector('#sidebar input[aria-label="Project search"]'), input);
  assert.equal(input.value, 'preserved draft');
});
