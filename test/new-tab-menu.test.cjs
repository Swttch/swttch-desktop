const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = join(__dirname, '../renderer/src/NewTabMenuContent.tsx');
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file)); loaded.require = name => name.endsWith('/i18n') ? require('./i18n-fixture.cjs') : Module.prototype.require.call(loaded, name); loaded._compile(compiled, file);
const { NewTabMenuContent } = loaded.exports;
test('new tab choices expose chat and an enabled terminal and disabled upcoming browser with icons', () => {
  const html = renderToStaticMarkup(React.createElement(NewTabMenuContent, { pending: false, onCreate: () => {} }));
  assert.match(html, /role="menu" aria-label="새 탭 열기"/);
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g);
  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /새 채팅 탭/); assert.doesNotMatch(buttons[0], /disabled/);
  assert.match(buttons[1], /새 터미널 탭/); assert.doesNotMatch(buttons[1], /disabled|준비 중/);
  for (const [index, label] of [[2, '새 브라우저 탭']]) {
    assert.match(buttons[index], /disabled/); assert.ok(buttons[index].includes(label)); assert.match(buttons[index], /준비 중/);
  }
  for (const button of buttons) assert.match(button, /<svg[^>]*aria-hidden="true"/);
  const busy = renderToStaticMarkup(React.createElement(NewTabMenuContent, { pending: true, onCreate: () => {} }));
  assert.equal((busy.match(/disabled=""/g) || []).length, 3);
});
test('chat and terminal choices invoke separate actions while browser has no action', () => {
  let opens = 0, terminals = 0;
  const menu = NewTabMenuContent({ pending: false, onCreate: () => opens++, onCreateTerminal: () => terminals++ });
  const buttons = React.Children.toArray(menu.props.children);
  buttons[0].props.onClick(); assert.equal(opens, 1);
  buttons[1].props.onClick(); assert.equal(terminals, 1); assert.equal(opens, 1); assert.equal(buttons[2].props.onClick, undefined);
});
