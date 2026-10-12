const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchShortcut, shortcutLabel, bindScopedShortcuts, neighboringPanel } = require('../src/desktop-shortcuts.mjs');
const key = (code, fields = {}) => ({ code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, isComposing: false, ...fields });
test('platform modifiers distinguish tab and panel navigation and retain text-editing keys', () => {
  for (const mac of [true, false]) {
    const primary = mac ? { metaKey: true } : { ctrlKey: true };
    assert.equal(matchShortcut(key('KeyD', primary), mac), 'split-columns');
    assert.equal(matchShortcut(key('KeyD', { ...primary, shiftKey: true }), mac), 'split-rows');
    for (const [code, command] of Object.entries({ KeyE: 'rename', KeyW: 'close', KeyB: 'favorite', Slash: 'help', Comma: 'settings' })) assert.equal(matchShortcut(key(code, primary), mac), command);
    assert.equal(matchShortcut(key('ArrowLeft', { ...primary, altKey: true }), mac), 'tab-left');
    assert.equal(matchShortcut(key('ArrowUp', { ...primary, altKey: true, ...(mac ? { ctrlKey: true } : { shiftKey: true }) }), mac), 'panel-up');
    assert.equal(matchShortcut(key('KeyD'), mac), null);
  }
  assert.equal(matchShortcut(key('KeyE', { ctrlKey: true }), true), null);
  assert.equal(shortcutLabel('split-rows', true), '⇧⌘D');
  assert.equal(shortcutLabel('panel-right', false), 'Ctrl+Alt+⇧+→');
});
test('close consumes its event before disposing its own listener and repeated close does not cascade', () => {
  const target = new EventTarget(); let closes = 0, outer = 0;
  let dispose;
  dispose = bindScopedShortcuts(target, true, () => { closes++; dispose(); });
  target.addEventListener('keydown', () => outer++);
  const event = new Event('keydown', { cancelable: true }); Object.assign(event, key('KeyW', { metaKey: true }));
  target.dispatchEvent(event);
  assert.equal(closes, 1); assert.equal(outer, 0); assert.equal(event.defaultPrevented, true);
  target.dispatchEvent(new Event('keydown')); assert.equal(outer, 1);
  const repeatTarget = new EventTarget(); let repeats = 0;
  const stop = bindScopedShortcuts(repeatTarget, true, () => repeats++);
  const repeat = new Event('keydown', { cancelable: true }); Object.assign(repeat, key('KeyW', { metaKey: true }), { repeat: true });
  repeatTarget.dispatchEvent(repeat); assert.equal(repeats, 0); assert.equal(repeat.defaultPrevented, true); stop();
});
test('spatial navigation finds neighbors without jumping diagonally into another column', () => {
  const rects = { left: { left: 0, top: 0, width: 300, height: 600 }, top: { left: 304, top: 0, width: 300, height: 300 }, bottom: { left: 304, top: 304, width: 300, height: 296 } };
  assert.equal(neighboringPanel(rects, 'bottom', 'up'), 'top');
  assert.equal(neighboringPanel(rects, 'top', 'left'), 'left');
  assert.equal(neighboringPanel(rects, 'left', 'up'), null);
  assert.equal(neighboringPanel(rects, 'left', 'right') !== null, true);
});
