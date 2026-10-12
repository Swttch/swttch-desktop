const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = join(__dirname, '../renderer/src/WorkPage.tsx');
const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file));
const originalRequire = loaded.require.bind(loaded);
loaded.require = name => {
  if (name !== './routes') return originalRequire(name);
  const routeFile = join(dirname(file), 'routes.ts');
  const routes = new Module(routeFile, module); routes.filename = routeFile; routes.paths = Module._nodeModulePaths(dirname(routeFile));
  routes._compile(ts.transpileModule(readFileSync(routeFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, routeFile);
  return routes.exports;
};
loaded._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, file);
const { WorkPage, isWorkPage, canExecuteWorkCommand } = loaded.exports;
test('work page appears only at the root, other pages keep children mounted but hidden and inert', () => {
  for (const path of ['/projects', '/projects/33', '/settings/general']) {
    assert.equal(isWorkPage(path), false);
    const html = renderToStaticMarkup(React.createElement(WorkPage, { active: isWorkPage(path) }, React.createElement('iframe', { title: 'retained view', 'data-view-id': 'existing' })));
    assert.match(html, /display:none/); assert.match(html, /aria-hidden="true"/); assert.match(html, /inert=""/); assert.match(html, /data-view-id="existing"/);
  }
  assert.equal(isWorkPage('/'), true);
  const root = renderToStaticMarkup(React.createElement(WorkPage, { active: true }, 'work'));
  assert.doesNotMatch(root, /display:none|inert=""|aria-hidden="true"/);
});
test('hidden work pages do not allow close, refresh or movement commands to mutate retained views', () => {
  for (const command of ['close', 'refresh', 'rename', 'favorite', 'tab-left', 'panel-up', 'move-left', 'split-columns']) {
    assert.equal(canExecuteWorkCommand(false, command), false); assert.equal(canExecuteWorkCommand(true, command), true);
  }
  for (const command of ['help', 'settings', 'sidebar', 'new-tab']) assert.equal(canExecuteWorkCommand(false, command), true);
});
