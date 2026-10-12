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
const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file)); loaded._compile(compiled, file);
const { NewTabMenuContent } = loaded.exports;
test('new tab choices expose chat and disabled upcoming applications with icons', () => {
  const html = renderToStaticMarkup(React.createElement(NewTabMenuContent, { pending: false, onCreate: () => {} }));
  assert.match(html, /role="menu" aria-label="새 탭 열기"/);
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g);
  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /새 채팅 탭/); assert.doesNotMatch(buttons[0], /disabled/);
  for (const [index, label] of [[1, '새 터미널 탭'], [2, '새 브라우저 탭']]) {
    assert.match(buttons[index], /disabled/); assert.ok(buttons[index].includes(label)); assert.match(buttons[index], /준비 중/);
  }
  for (const button of buttons) assert.match(button, /<svg[^>]*aria-hidden="true"/);
  const busy = renderToStaticMarkup(React.createElement(NewTabMenuContent, { pending: true, onCreate: () => {} }));
  assert.equal((busy.match(/disabled=""/g) || []).length, 3);
});
test('only the chat menu item has an action, and selecting it invokes creation once', () => {
  let opens = 0;
  const menu = NewTabMenuContent({ pending: false, onCreate: () => opens++ });
  const buttons = React.Children.toArray(menu.props.children);
  buttons[0].props.onClick(); assert.equal(opens, 1);
  assert.equal(buttons[1].props.onClick, undefined); assert.equal(buttons[2].props.onClick, undefined);
});
