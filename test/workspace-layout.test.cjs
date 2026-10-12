const { test } = require('node:test');
const assert = require('node:assert/strict');
const { panels, openTab, selectTab, closeTabs, splitPanel, resizeSplit, updateTab } = require('../src/workspace-layout.mjs');
const tab = id => ({ id, title: id, sessionId: '', url: 'http://localhost:3031/sessions/new?workingDir=/tmp', projectPath: '/tmp', projectId: 1 });
const initial = () => ({ kind: 'panel', id: 'p1', tabs: [], activeTabId: null });

test('panels own independent tab selection and closing is confined to its panel', () => {
  let tree = openTab(openTab(initial(), 'p1', tab('a')), 'p1', tab('b'));
  tree = splitPanel(tree, 'p1', tab('c'), 'columns', 'p2', 's1');
  tree = openTab(tree, 'p2', tab('d'));
  tree = selectTab(tree, 'p1', 'a');
  assert.deepEqual(panels(tree).map(panel => panel.activeTabId), ['a', 'd']);
  tree = closeTabs(tree, 'p1', ['b']);
  assert.deepEqual(panels(tree).map(panel => panel.tabs.map(view => view.id)), [['a'], ['c', 'd']]);
  tree = updateTab(tree, 'a', { sessionId: 'original-session' });
  assert.equal(panels(tree)[1].tabs[0].sessionId, '');
  assert.equal(panels(tree)[0].tabs[0].sessionId, 'original-session');
});
test('nested row and column splits collapse empty panels while retaining sibling views', () => {
  let tree = openTab(initial(), 'p1', tab('a'));
  tree = splitPanel(tree, 'p1', tab('b'), 'columns', 'p2', 's1');
  tree = splitPanel(tree, 'p2', tab('c'), 'rows', 'p3', 's2');
  assert.equal(tree.children[1].direction, 'rows');
  tree = resizeSplit(tree, 's2', 2);
  assert.equal(tree.children[1].ratio, .85);
  tree = closeTabs(tree, 'p2', ['b']);
  assert.deepEqual(panels(tree).map(panel => panel.id), ['p1', 'p3']);
  assert.equal(tree.children[1].kind, 'panel');
  tree = closeTabs(tree, 'p3', ['c']);
  assert.equal(tree.kind, 'panel');
  assert.equal(tree.tabs[0].id, 'a');
  tree = closeTabs(tree, 'p1', ['a']);
  assert.equal(tree.kind, 'panel');
  assert.equal(tree.activeTabId, null);
});

test('closing selected tabs restores the most recently focused survivor, not tab order', () => {
  let tree = ['a', 'b', 'c', 'd'].reduce((node, id) => openTab(node, 'p1', tab(id)), initial());
  tree = selectTab(tree, 'p1', 'c');
  tree = selectTab(tree, 'p1', 'a');
  tree = closeTabs(tree, 'p1', ['a']);
  assert.equal(tree.activeTabId, 'c');
  tree = closeTabs(tree, 'p1', ['b']);
  assert.equal(tree.activeTabId, 'c');
  tree = closeTabs(tree, 'p1', ['c']);
  assert.equal(tree.activeTabId, 'd');
  assert.deepEqual(tree.focusHistory, ['d']);
});
