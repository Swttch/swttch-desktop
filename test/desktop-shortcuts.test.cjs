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

test('browser close uses only Option/Alt+W while Electron retains its primary modifier', () => {
  for (const mac of [true, false]) {
    const primary = mac ? { metaKey: true } : { ctrlKey: true };
    assert.equal(matchShortcut(key('KeyW', { altKey: true }), mac, true), 'close');
    assert.equal(matchShortcut(key('KeyW', primary), mac, true), null);
    assert.equal(matchShortcut(key('KeyW', primary), mac, false), 'close');
    assert.equal(matchShortcut(key('KeyW', { altKey: true }), mac, false), null);
    for (const extra of [{ shiftKey: true }, { metaKey: true }, { ctrlKey: true }, { isComposing: true }]) assert.equal(matchShortcut(key('KeyW', { altKey: true, ...extra }), mac, true), null);
    assert.equal(shortcutLabel('close', mac, true), mac ? '⌥W' : 'Alt+W');
    assert.equal(shortcutLabel('close', mac, false), mac ? '⌘W' : 'Ctrl+W');
  }
  const target = new EventTarget(); let closes = 0, outer = 0;
  const dispose = bindScopedShortcuts(target, true, () => closes++, true);
  target.addEventListener('keydown', () => outer++);
  const event = new Event('keydown', { cancelable: true }); Object.assign(event, key('KeyW', { altKey: true }));
  target.dispatchEvent(event);
  assert.equal(closes, 1); assert.equal(outer, 0); assert.equal(event.defaultPrevented, true);
  dispose();
});

test('tab refresh and browser navigation use host-specific modifiers without collisions', () => {
  assert.equal(matchShortcut(key('KeyR', { metaKey: true }), true, false), 'refresh');
  assert.equal(matchShortcut(key('KeyR', { altKey: true }), true, true), 'refresh');
  assert.equal(matchShortcut(key('KeyR', { metaKey: true }), true, true), null);
  assert.equal(matchShortcut(key('KeyR', { ctrlKey: true }), false, false), 'refresh');
  assert.equal(matchShortcut(key('KeyR', { altKey: true }), false, true), 'refresh');
  assert.equal(shortcutLabel('refresh', true, true), '⌥R');
  assert.equal(shortcutLabel('refresh', true, false), '⌘R');
  for (const [arrow, command] of [['Left', 'tab-left'], ['Right', 'tab-right']]) {
    assert.equal(matchShortcut(key('Arrow' + arrow, { ctrlKey: true, altKey: true }), true, true), command);
    assert.equal(matchShortcut(key('Arrow' + arrow, { metaKey: true, altKey: true }), true, true), null);
    assert.equal(shortcutLabel(command, true, true), '⌃⌥' + (arrow === 'Left' ? '←' : '→'));
  }
  assert.equal(matchShortcut(key('ArrowUp', { ctrlKey: true, altKey: true, metaKey: true }), true, true), 'panel-up');
});
test('moving a tab into an edge split has four distinct commands and does not repeat while held', () => {
  for (const direction of ['Left', 'Right', 'Up', 'Down']) {
    assert.equal(matchShortcut(key('Arrow' + direction, { ctrlKey: true, metaKey: true }), true), 'move-' + direction.toLowerCase());
    assert.equal(matchShortcut(key('Arrow' + direction, { ctrlKey: true, shiftKey: true }), false), 'move-' + direction.toLowerCase());
  }
  assert.equal(shortcutLabel('move-left', true), '⌃⌘←');
  assert.equal(shortcutLabel('move-up', false), 'Ctrl+⇧+↑');
  const target = new EventTarget(); let actions = 0;
  const dispose = bindScopedShortcuts(target, true, () => actions++);
  const repeated = new Event('keydown', { cancelable: true }); Object.assign(repeated, key('ArrowRight', { ctrlKey: true, metaKey: true }), { repeat: true });
  target.dispatchEvent(repeated); assert.equal(actions, 0); assert.equal(repeated.defaultPrevented, true); dispose();
});

test('browser substitutes conflicting Chrome commands without intercepting the originals', () => {
  for (const mac of [true, false]) {
    const primary = mac ? { metaKey: true } : { ctrlKey: true };
    for (const [code, command, label] of [['KeyN', 'new-tab', 'N'], ['KeyD', 'split-columns', 'D'], ['KeyE', 'rename', 'E'], ['Comma', 'settings', ',']]) {
      const extraControl = !mac && ['KeyD', 'KeyE'].includes(code);
      assert.equal(matchShortcut(key(code, { altKey: true, ctrlKey: extraControl }), mac, true), command);
      assert.equal(matchShortcut(key(code, primary), mac, true), null);
      assert.equal(matchShortcut(key(code, primary), mac, false), command);
      assert.equal(shortcutLabel(command, mac, true), (mac ? '⌥' : extraControl ? 'Ctrl+Alt+' : 'Alt+') + label);
    }
    const split = { altKey: true, shiftKey: true, ctrlKey: !mac };
    assert.equal(matchShortcut(key('KeyD', split), mac, true), 'split-rows');
    assert.equal(matchShortcut(key('KeyD', { ...primary, shiftKey: true }), mac, true), null);
    assert.equal(shortcutLabel('split-rows', mac, true), mac ? '⇧⌥D' : 'Ctrl+Alt+⇧+D');
    assert.equal(matchShortcut(key('KeyB', primary), mac, true), 'favorite');
    assert.equal(matchShortcut(key('Slash', primary), mac, true), 'help');
    assert.equal(matchShortcut(key('KeyN', { altKey: true, shiftKey: true }), mac, true), null);
  }
  assert.equal(matchShortcut(key('KeyD', { altKey: true }), false, true), null);
  assert.equal(matchShortcut(key('KeyE', { altKey: true }), false, true), null);
});
