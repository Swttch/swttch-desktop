const { test } = require('node:test');
const assert = require('node:assert/strict');
const { panels, moveTab, moveTabToSplit, panelDropEdge, openTab, selectTab, closeTabs, splitPanel, resizeSplit, updateTab } = require('../src/workspace-layout.mjs');
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

test('tab moves reorder within a panel and transfer existing views across nested panels', () => {
  let tree = ['a', 'b', 'c'].reduce((node, id) => openTab(node, 'p1', tab(id)), initial());
  const original = tree.tabs[0];
  tree = moveTab(tree, 'a', 'p1', 3);
  assert.deepEqual(tree.tabs.map(view => view.id), ['b', 'c', 'a']);
  assert.equal(tree.tabs[2], original);
  assert.equal(moveTab(tree, 'a', 'p1', 3), tree);
  tree = moveTab(tree, 'a', 'p1', 0);
  assert.deepEqual(tree.tabs.map(view => view.id), ['a', 'b', 'c']);
  tree = splitPanel(tree, 'p1', tab('d'), 'columns', 'p2', 's1');
  tree = splitPanel(tree, 'p2', tab('e'), 'rows', 'p3', 's2');
  tree = moveTab(tree, 'a', 'p3', 0);
  assert.deepEqual(panels(tree).map(panel => panel.tabs.map(view => view.id)), [['b', 'c'], ['d'], ['a', 'e']]);
  assert.equal(panels(tree)[2].tabs[0], original);
  assert.equal(panels(tree)[2].activeTabId, 'a');
  tree = moveTab(tree, 'd', 'p1', 1);
  assert.deepEqual(panels(tree).map(panel => panel.id), ['p1', 'p3']);
  assert.deepEqual(panels(tree)[0].tabs.map(view => view.id), ['b', 'd', 'c']);
  assert.equal(moveTab(tree, 'missing', 'p1', 0), tree);
  assert.equal(moveTab(tree, 'a', 'missing', 0), tree);
});

test('edge drops move the same view into a new panel on all four sides', () => {
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    let tree = openTab(openTab(initial(), 'p1', tab('a')), 'p1', tab('b'));
    const original = tree.tabs[0];
    tree = moveTabToSplit(tree, 'a', 'p1', edge, 'p2', 's1');
    assert.equal(tree.direction, ['left', 'right'].includes(edge) ? 'columns' : 'rows');
    assert.deepEqual(panels(tree).map(panel => panel.id), ['left', 'top'].includes(edge) ? ['p2', 'p1'] : ['p1', 'p2']);
    assert.equal(panels(tree).find(panel => panel.id === 'p2').tabs[0], original);
    assert.deepEqual(panels(tree).flatMap(panel => panel.tabs.map(view => view.id)).sort(), ['a', 'b']);
  }
});
test('edge transfers collapse an emptied source and ignore self-splits of single tabs', () => {
  let tree = openTab(initial(), 'p1', tab('a'));
  assert.equal(moveTabToSplit(tree, 'a', 'p1', 'right', 'p2', 's1'), tree);
  tree = splitPanel(tree, 'p1', tab('b'), 'columns', 'p2', 's1');
  tree = moveTabToSplit(tree, 'a', 'p2', 'bottom', 'p3', 's2');
  assert.equal(tree.id, 's2');
  assert.equal(tree.direction, 'rows');
  assert.deepEqual(panels(tree).map(panel => panel.tabs.map(view => view.id)), [['b'], ['a']]);
  assert.equal(moveTabToSplit(tree, 'a', 'p2', 'center', 'p4', 's3'), tree);
  assert.equal(panelDropEdge(5, 100, 400, 200), 'left');
  assert.equal(panelDropEdge(395, 100, 400, 200), 'right');
  assert.equal(panelDropEdge(200, 5, 400, 200), 'top');
  assert.equal(panelDropEdge(200, 195, 400, 200), 'bottom');
  assert.equal(panelDropEdge(200, 100, 400, 200), 'center');
});

test('restored active panel is not stolen by view mount autofocus, while user interaction can select it', () => {
  const { canActivateWorkspaceView } = require('../src/workspace-layout.mjs');
  assert.equal(canActivateWorkspaceView(true, false), false);
  assert.equal(canActivateWorkspaceView(true, true), true);
  assert.equal(canActivateWorkspaceView(false, false), true);
});

test('view mount order stays stable across tab movement so iframe DOM is never reinserted', () => {
  const { stableViewOrder, moveTabToSplit } = require('../src/workspace-layout.mjs');
  let tree = splitPanel(openTab(initial(), 'p1', tab('a')), 'p1', tab('b'), 'columns', 'p2', 's');
  tree = openTab(tree, 'p1', tab('c'));
  const order = stableViewOrder([], tree);
  tree = moveTabToSplit(tree, 'a', 'p1', 'right', 'p3', 's2');
  assert.deepEqual(stableViewOrder(order, tree), order);
  tree = closeTabs(tree, 'p3', ['a']); tree = openTab(tree, 'p2', tab('d'));
  assert.deepEqual(stableViewOrder(order, tree), ['c', 'b', 'd']);
});
