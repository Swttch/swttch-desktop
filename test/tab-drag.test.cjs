const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('panel body accepts tab transfers only and preserves the existing center-drop behavior', () => {
  let dropSpec;
  const file = join(__dirname, '../renderer/src/TabDrag.tsx');
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(dirname(file));
  const original = loaded.require.bind(loaded);
  loaded.require = name => name === 'react-dnd' ? { useDrop: factory => { dropSpec = factory(); return [{ over: false }, () => {}]; } } : name === './Tooltip' ? { Tooltip: ({ children }) => children } : original(name);
  loaded._compile(compiled, file);
  const transfers = [];
  renderToStaticMarkup(React.createElement(loaded.exports.PanelDropZone, { panelId: 'destination', tabIds: ['selected'], disabled: false, onMove: (...args) => transfers.push(args) }));
  const types = [].concat(dropSpec.accept);
  assert.ok(types.includes('swttch-workspace-tab'));
  assert.equal(types.includes('swttch-workspace-panel'), false);
  const monitor = { getItemType: () => 'swttch-workspace-tab', getClientOffset: () => null, didDrop: () => false };
  assert.equal(dropSpec.canDrop({ id: 'selected' }, monitor), false);
  assert.equal(dropSpec.canDrop({ id: 'other-tab' }, monitor), true);
  dropSpec.drop({ id: 'other-tab' }, monitor);
  assert.deepEqual(transfers, [['other-tab', 'destination', 'center']]);
});
