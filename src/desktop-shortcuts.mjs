export function matchShortcut(event, mac) {
  if (event.isComposing || !(mac ? event.metaKey : event.ctrlKey) || (!mac && event.metaKey)) return null;
  const arrow = /^Arrow(Left|Right|Up|Down)$/.exec(event.key);
  if (arrow && event.altKey) {
    if (mac ? event.ctrlKey && !event.shiftKey : event.shiftKey) return 'panel-' + arrow[1].toLowerCase();
    if (!event.shiftKey && (!mac || !event.ctrlKey) && ['Left', 'Right'].includes(arrow[1])) return 'tab-' + arrow[1].toLowerCase();
    return null;
  }
  if (event.altKey || (mac && event.ctrlKey)) return null;
  const key = event.code || ({ '/': 'Slash', ',': 'Comma' }[event.key] || 'Key' + event.key.toUpperCase());
  if (key === 'KeyD') return event.shiftKey ? 'split-rows' : 'split-columns';
  if (event.shiftKey) return key === 'KeyS' ? 'sidebar' : null;
  return { KeyE: 'rename', KeyW: 'close', KeyB: 'favorite', Slash: 'help', Comma: 'settings', KeyN: 'new-tab' }[key] || null;
}
export function shortcutLabel(command, mac) {
  const primary = mac ? '⌘' : 'Ctrl+';
  const alt = mac ? '⌥' : 'Alt+';
  const extra = mac ? '⌃' : '⇧+';
  const key = { rename: 'E', close: 'W', favorite: 'B', help: '/', settings: ',', 'new-tab': 'N', 'split-columns': 'D' }[command];
  if (key) return primary + key;
  if (command === 'split-rows') return (mac ? '⇧⌘' : 'Ctrl+⇧+') + 'D';
  if (command === 'sidebar') return (mac ? '⇧⌘' : 'Ctrl+⇧+') + 'S';
  const match = /^(tab|panel)-(left|right|up|down)$/.exec(command);
  return match ? (mac ? (match[1] === 'panel' ? extra : '') + alt + primary : primary + alt + (match[1] === 'panel' ? extra : '')) + ({ left: '←', right: '→', up: '↑', down: '↓' }[match[2]]) : '';
}
export function bindScopedShortcuts(target, mac, execute) {
  const receive = event => {
    const command = matchShortcut(event, mac);
    if (!command) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if (!event.repeat || /^(tab|panel)-/.test(command)) execute(command, event);
  };
  target.addEventListener('keydown', receive, true);
  return () => target.removeEventListener('keydown', receive, true);
}
export function neighboringPanel(rects, currentId, direction) {
  const from = rects[currentId]; if (!from) return null;
  const horizontal = direction === 'left' || direction === 'right';
  const center = box => horizontal ? box.left + box.width / 2 : box.top + box.height / 2;
  const cross = box => horizontal ? box.top + box.height / 2 : box.left + box.width / 2;
  const candidates = Object.entries(rects).filter(([id, box]) => {
    if (id === currentId) return false;
    const overlap = horizontal ? Math.min(from.top + from.height, box.top + box.height) - Math.max(from.top, box.top) : Math.min(from.left + from.width, box.left + box.width) - Math.max(from.left, box.left);
    return overlap > 0 && (['left', 'up'].includes(direction) ? center(box) < center(from) : center(box) > center(from));
  }).sort(([, a], [, b]) => (Math.abs(center(a) - center(from)) + Math.abs(cross(a) - cross(from))) - (Math.abs(center(b) - center(from)) + Math.abs(cross(b) - cross(from))));
  return candidates[0]?.[0] || null;
}
