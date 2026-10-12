const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ActivationController } = require('@dnd-kit/abstract');
const { projectDragActivationConstraints } = require('../src/project-drag-activation.mjs');
const event = (type, x, y) => ({ type, clientX: x, clientY: y });
test('project clicks and small pointer jitter do not activate dragging', () => {
  let starts = 0;
  const controller = new ActivationController(projectDragActivationConstraints(), () => starts++);
  controller.onEvent(event('pointerdown', 100, 100));
  assert.equal(starts, 0);
  controller.onEvent(event('pointermove', 102, 102));
  assert.equal(starts, 0);
  controller.onEvent(event('pointerup', 102, 102));
  assert.equal(starts, 0);
});
test('intentional movement starts one drag, and a cancelled gesture cannot start later', () => {
  let starts = 0;
  const controller = new ActivationController(projectDragActivationConstraints(), () => starts++);
  controller.onEvent(event('pointerdown', 100, 100));
  controller.onEvent(event('pointermove', 112, 100));
  controller.onEvent(event('pointermove', 120, 100));
  assert.equal(starts, 1);
  const cancelled = new ActivationController(projectDragActivationConstraints(), () => starts++);
  cancelled.onEvent(event('pointerdown', 100, 100)); cancelled.abort();
  cancelled.onEvent(event('pointermove', 120, 100)); assert.equal(starts, 1);
});
