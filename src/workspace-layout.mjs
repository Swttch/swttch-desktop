export function panels(node) { return node.kind === 'panel' ? [node] : node.children.flatMap(panels); }
export function updatePanel(node, id, update) {
  if (node.kind === 'panel') return node.id === id ? update(node) : node;
  return { ...node, children: node.children.map(child => updatePanel(child, id, update)) };
}
export function openTab(node, panelId, tab) {
  return updatePanel(node, panelId, panel => ({ ...panel, tabs: [...panel.tabs, tab], activeTabId: tab.id, focusHistory: [tab.id, ...(panel.focusHistory || []).filter(id => id !== tab.id)] }));
}
export function selectTab(node, panelId, tabId) {
  return updatePanel(node, panelId, panel => panel.tabs.some(tab => tab.id === tabId) ? { ...panel, activeTabId: tabId, focusHistory: [tabId, ...(panel.focusHistory || []).filter(id => id !== tabId)] } : panel);
}
export function updateTab(node, tabId, fields) {
  if (node.kind === 'panel') return { ...node, tabs: node.tabs.map(tab => tab.id === tabId ? { ...tab, ...fields } : tab) };
  return { ...node, children: node.children.map(child => updateTab(child, tabId, fields)) };
}
export function closeTabs(node, panelId, ids, root = true) {
  if (node.kind === 'panel') {
    if (node.id !== panelId) return node;
    const tabs = node.tabs.filter(tab => !ids.includes(tab.id));
    if (!tabs.length && !root) return null;
    const focusHistory = (node.focusHistory || []).filter(id => tabs.some(tab => tab.id === id));
    const index = node.tabs.findIndex(tab => tab.id === node.activeTabId);
    return { ...node, tabs, focusHistory, activeTabId: tabs.some(tab => tab.id === node.activeTabId) ? node.activeTabId : focusHistory[0] || tabs[Math.min(Math.max(index - 1, 0), tabs.length - 1)]?.id || null };
  }
  const children = node.children.map(child => closeTabs(child, panelId, ids, false)).filter(Boolean);
  if (children.length === 1) return children[0];
  return { ...node, children };
}
export function splitPanel(node, panelId, tab, direction, panelIdNew, splitId) {
  return updatePanel(node, panelId, panel => ({ kind: 'split', id: splitId, direction, ratio: .5, children: [panel, { kind: 'panel', id: panelIdNew, tabs: [tab], activeTabId: tab.id, focusHistory: [tab.id] }] }));
}
export function resizeSplit(node, id, ratio) {
  if (node.kind === 'panel') return node;
  return { ...node, ratio: node.id === id ? Math.max(.15, Math.min(.85, ratio)) : node.ratio, children: node.children.map(child => resizeSplit(child, id, ratio)) };
}

export function moveTab(node, tabId, targetPanelId, insertionIndex) {
  const source = panels(node).find(panel => panel.tabs.some(tab => tab.id === tabId));
  const target = panels(node).find(panel => panel.id === targetPanelId);
  if (!source || !target || !Number.isInteger(insertionIndex)) return node;
  const sourceIndex = source.tabs.findIndex(tab => tab.id === tabId);
  const tab = source.tabs[sourceIndex];
  let index = Math.max(0, Math.min(insertionIndex, target.tabs.length));
  if (source.id === target.id) {
    if (sourceIndex < index) index--;
    if (index === sourceIndex) return node;
    return updatePanel(node, target.id, panel => {
      const tabs = panel.tabs.filter(item => item.id !== tabId);
      tabs.splice(index, 0, tab);
      return { ...panel, tabs };
    });
  }
  // Insert before collapsing an emptied source panel so the destination survives.
  const inserted = updatePanel(node, target.id, panel => {
    const tabs = [...panel.tabs]; tabs.splice(index, 0, tab);
    return { ...panel, tabs, activeTabId: tabId, focusHistory: [tabId, ...(panel.focusHistory || []).filter(id => id !== tabId)] };
  });
  return closeTabs(inserted, source.id, [tabId]);
}

export function panelDropEdge(x, y, width, height) {
  if (width <= 0 || height <= 0) return 'center';
  const edges = [['left', x / width], ['right', 1 - x / width], ['top', y / height], ['bottom', 1 - y / height]];
  const nearest = edges.sort((a, b) => a[1] - b[1])[0];
  return nearest[1] < .25 ? nearest[0] : 'center';
}
export function moveTabToSplit(node, tabId, targetPanelId, edge, newPanelId, splitId) {
  const source = panels(node).find(panel => panel.tabs.some(tab => tab.id === tabId));
  const target = panels(node).find(panel => panel.id === targetPanelId);
  if (!source || !target || !['left', 'right', 'top', 'bottom'].includes(edge)) return node;
  if (source.id === target.id && source.tabs.length === 1) return node;
  const tab = source.tabs.find(item => item.id === tabId);
  const created = updatePanel(node, target.id, panel => {
    const sibling = { kind: 'panel', id: newPanelId, tabs: [tab], activeTabId: tabId, focusHistory: [tabId] };
    return { kind: 'split', id: splitId, direction: ['left', 'right'].includes(edge) ? 'columns' : 'rows', ratio: .5,
      children: ['left', 'top'].includes(edge) ? [sibling, panel] : [panel, sibling] };
  });
  return closeTabs(created, source.id, [tabId]);
}

// Only durable references belong on disk. URLs contain short-lived pairing codes.
export function workspaceSnapshot(layout, activePanel, focusHistory) {
  function durable(node) {
    if (node.kind === "split") return { kind: node.kind, id: node.id, direction: node.direction, ratio: node.ratio, children: node.children.map(durable) };
    return { kind: node.kind, id: node.id, activeTabId: node.activeTabId, focusHistory: node.focusHistory || [], tabs: node.tabs.map(tab => ({
      id: tab.id, kind: tab.kind || "chat", projectId: tab.projectId, sessionId: tab.sessionId, title: tab.title,
      ...(tab.customTitle === undefined ? {} : { customTitle: tab.customTitle }),
    })) };
  }
  const leaves = panels(layout), ids = new Set(leaves.flatMap(panel => panel.tabs.map(tab => tab.id)));
  return { version: 1, layout: durable(layout), activePanel: leaves.some(panel => panel.id === activePanel) ? activePanel : leaves[0].id,
    focusHistory: focusHistory.filter(id => ids.has(id)) };
}

export function canActivateWorkspaceView(restoring, interaction) { return !restoring || interaction; }

export function stableViewOrder(previous, layout) {
  const ids = panels(layout).flatMap(panel => panel.tabs.map(tab => tab.id));
  const live = new Set(ids), retained = new Set(previous);
  return [...previous.filter(id => live.has(id)), ...ids.filter(id => !retained.has(id))];
}
