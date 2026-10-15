import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { childPopovers, hideUnrelatedPopovers } from './tippy-interactions';
import tippy, { type Instance } from 'tippy.js';

export enum SidebarKind { Home = 'home', Settings = 'settings' }

/** One mounted tree per sidebar, shared by the pinned slot and its hover panel. */
export function FloatingSidebar({ current, hidden, routeKey, width, homeTrigger, toggleTrigger, homeContent, settingsContent, closeRef }: {
  current: SidebarKind; hidden: boolean; routeKey: string; width: number;
  homeTrigger: RefObject<HTMLButtonElement | null>; toggleTrigger: RefObject<HTMLButtonElement | null>;
  homeContent: ReactNode; settingsContent: ReactNode; closeRef?: RefObject<(() => void) | null>;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const latest = useRef({ current, hidden, width }); latest.current = { current, hidden, width };
  const active = useRef<{ instance: Instance; kind: SidebarKind; button: HTMLButtonElement } | null>(null);
  const [containers] = useState(() => ({ home: document.createElement('div'), settings: document.createElement('div') }));
  const dismiss = () => {
    if (!active.current) return;
    for (const child of childPopovers(containers[active.current.kind])) child.hide();
    active.current?.instance.hide();
  };
  const mountInline = () => {
    if (!slot.current) return;
    const { current, hidden } = latest.current;
    if (active.current?.kind === current && hidden) return;
    const container = containers[current];
    if (container.parentElement !== slot.current) slot.current.replaceChildren(container);
  };
  const syncInline = useRef(mountInline); syncInline.current = mountInline;

  useLayoutEffect(() => {
    dismiss();
    mountInline();
  }, [current, hidden, routeKey, containers]);

  useEffect(() => {
    const targets = [
      { ref: homeTrigger, kind: SidebarKind.Home },
      { ref: toggleTrigger, kind: null },
    ];
    const entries = targets.flatMap(({ ref, kind }) => {
      const button = ref.current;
      if (!button) return [];
      const eligible = () => {
        const state = latest.current;
        return state.hidden;
      };
      const surface = () => {
        const selected = kind || latest.current.current;
        const container = containers[selected];
        container.dataset.sidebarKind = selected;
        container.classList.add('floating-sidebar-content');
        container.style.width = `${latest.current.width}px`;
        container.style.setProperty('--sidebar-width', `${latest.current.width}px`);
        const app = button.closest('.app');
        const body = app?.querySelector('.shell-body')?.getBoundingClientRect();
        const footer = app?.querySelector('footer')?.getBoundingClientRect();
        container.style.height = `${Math.max(120, window.innerHeight - (body?.top || 35) - (footer?.height || 28) - 12)}px`;
        return { selected, container };
      };
      let floatingContainer: HTMLDivElement | null = null;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const instance = tippy(button, {
        content: document.createElement('div'), trigger: 'mouseenter', interactive: true, interactiveBorder: 12, interactiveDebounce: 0,
        delay: [120, 0], duration: reducedMotion ? 0 : [160, 120], animation: 'floating-sidebar', hideOnClick: false,
        appendTo: () => document.body, placement: 'right-start', offset: [0, 8], arrow: false,
        theme: 'swttch-dropdown', role: 'dialog', maxWidth: 'none', aria: { content: null, expanded: false },
        getReferenceClientRect: () => {
          const app = button.closest('.app');
          const rail = app?.querySelector('.activity-rail')?.getBoundingClientRect();
          const body = app?.querySelector('.shell-body')?.getBoundingClientRect();
          const x = rail?.right || 49, y = (body?.top || 35) + 4;
          return { x, y, top: y, bottom: y, left: x, right: x, width: 0, height: 0, toJSON: () => ({}) };
        },
        popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', enabled: false }, { name: 'preventOverflow', options: { padding: 8 } }] },
        onShow: instance => {
          if (!eligible()) return false;
          hideUnrelatedPopovers(instance, button);
          const { selected, container } = surface();
          floatingContainer = container;
          active.current = { instance, kind: selected, button };
          container.classList.add('is-floating');
          instance.setContent(container);
          if (ref !== toggleTrigger) button.setAttribute('aria-expanded', 'true');
        },
        onHide: () => {
          if (active.current?.instance === instance && childPopovers(containers[active.current.kind]).length) return false;
          // Keep the content in the panel throughout its exit transition.
          if (ref !== toggleTrigger) button.setAttribute('aria-expanded', 'false');
        },
        onHidden: () => {
          // Reset Tippy's content identity so the same portal is reattached on reopening.
          instance.setContent(document.createElement('div'));
          if (!floatingContainer) return;
          // A second trigger may already be showing the same mounted sidebar.
          if (active.current && active.current.instance !== instance && containers[active.current.kind] === floatingContainer) return;
          floatingContainer.classList.remove('is-floating');
          floatingContainer.style.height = '100%';
          if (active.current?.instance === instance) active.current = null;
          syncInline.current();
        },
        onClickOutside: (_, event) => {
          if (!active.current) return;
          const children = childPopovers(containers[active.current.kind]);
          if (event.target instanceof Node && children.some(child => child.popper.contains(event.target as Node))) return;
          dismiss();
        },
      });
      const click = () => instance.hide();
      const keyboard = (event: KeyboardEvent) => {
        if ((event.key === 'ArrowRight' || event.key === 'ArrowDown') && eligible()) {
          event.preventDefault(); instance.show();
          containers[kind || latest.current.current].querySelector<HTMLElement>('input, button:not(:disabled), [tabindex="0"]')?.focus();
        }
      };
      button.addEventListener('click', click);
      button.addEventListener('keydown', keyboard);
      return [{ instance, button, click, keyboard }];
    });
    const close = () => dismiss();
    if (closeRef) closeRef.current = close;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current) {
        const button = active.current.button;
        close(); button.focus();
      }
    };
    const blur = () => close();
    const resize = () => { if (active.current) { const container = containers[active.current.kind]; container.style.height = `${Math.max(120, window.innerHeight - 75)}px`; void active.current.instance.popperInstance?.update(); } };
    document.addEventListener('keydown', escape);
    window.addEventListener('blur', blur);
    window.addEventListener('resize', resize);
    return () => {
      close();
      for (const { instance, button, click, keyboard } of entries) { instance.destroy(); button.removeEventListener('click', click); button.removeEventListener('keydown', keyboard); }
      document.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize);
      if (closeRef) closeRef.current = null;
    };
  }, [containers, homeTrigger, toggleTrigger, closeRef]);

  useLayoutEffect(() => {
    for (const container of Object.values(containers)) { container.style.width = `${width}px`; container.style.setProperty('--sidebar-width', `${width}px`); }
    void active.current?.instance.popperInstance?.update();
  }, [width, containers]);

  return <><div ref={slot} className="sidebar-slot h-full min-h-0" />{createPortal(homeContent, containers.home)}{createPortal(settingsContent, containers.settings)}</>;
}
