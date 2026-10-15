import type { Instance } from 'tippy.js';

function openPopovers() {
  return [...document.querySelectorAll<HTMLElement & { _tippy?: Instance }>('[data-tippy-root]')].reverse().flatMap(root => root._tippy?.state.isVisible ? [root._tippy] : []);
}

/** Close descendants first, while retaining any ancestor of the new reference. */
export function hideUnrelatedPopovers(instance: Instance, reference: Element) {
  for (const other of openPopovers()) if (other !== instance && !other.popper.contains(reference)) other.hide();
}

export function childPopovers(container: HTMLElement) {
  return openPopovers().filter(instance => container.contains(instance.reference));
}
