import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { hideUnrelatedPopovers } from './tippy-interactions';
import tippy, { type Placement } from 'tippy.js';

export function Dropdown({ children, content, closeRef, onOpen, onClose, contextMenu = false, submenu = false, placement = 'top-start' }: { children: ReactNode; content: ReactNode; closeRef?: RefObject<(() => void) | null>; onOpen?: () => void; onClose?: () => void; contextMenu?: boolean; submenu?: boolean; placement?: Placement }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const opened = useRef(onOpen);
  opened.current = onOpen;
  const closed = useRef(onClose);
  closed.current = onClose;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const button = anchor.current?.querySelector('button');
    if (!button) return;
    const element = document.createElement('div');
    button.setAttribute('aria-haspopup', contextMenu ? 'menu' : 'dialog');
    setContainer(element);
    const instance = tippy(button, {
      content: element, trigger: contextMenu ? 'manual' : submenu ? 'mouseenter focus click' : 'click', interactive: true, hideOnClick: true,
      appendTo: () => document.body, placement, arrow: false, interactiveBorder: submenu ? 16 : 2,
      theme: 'swttch-dropdown', role: contextMenu ? 'presentation' : 'dialog', maxWidth: 'none', duration: [120, 80],
      aria: { content: null, expanded: false },
      onShow: instance => { if (!submenu) hideUnrelatedPopovers(instance, button); button.setAttribute('aria-expanded', 'true'); opened.current?.(); },
      onHide: () => { button.setAttribute('aria-expanded', 'false'); closed.current?.(); },
      onShown: () => { if (contextMenu) element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus(); },
    });
    const openContext = (event: MouseEvent) => {
      event.preventDefault();
      const { clientX: x, clientY: y } = event;
      instance.setProps({ placement: 'bottom-start', getReferenceClientRect: () => ({ width: 0, height: 0, top: y, bottom: y, left: x, right: x, x, y, toJSON: () => ({}) }) });
      instance.show();
    };
    const contextKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault(); instance.setProps({ placement: 'bottom-start', getReferenceClientRect: () => button.getBoundingClientRect() }); instance.show();
      }
    };
    const reference = anchor.current;
    if (contextMenu) { reference?.addEventListener('contextmenu', openContext); reference?.addEventListener('keydown', contextKeyboard); }
    if (closeRef) closeRef.current = () => instance.hide();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && instance.state.isVisible) { button.focus(); instance.hide(); }
    };
    const blur = () => { if (document.activeElement instanceof HTMLIFrameElement) instance.hide(); };
    document.addEventListener('keydown', escape);
    window.addEventListener('blur', blur);
    return () => {
      instance.destroy(); if (closeRef) closeRef.current = null;
      reference?.removeEventListener('contextmenu', openContext); reference?.removeEventListener('keydown', contextKeyboard);
      document.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
    };
  }, [closeRef, contextMenu, submenu, placement]);
  return <><span ref={anchor} className="tooltip-anchor">{children}</span>{container && createPortal(content, container)}</>;
}
