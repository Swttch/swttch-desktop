import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import tippy, { hideAll } from 'tippy.js';

export function Dropdown({ children, content, closeRef, onOpen }: { children: ReactNode; content: ReactNode; closeRef?: RefObject<(() => void) | null>; onOpen?: () => void }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const opened = useRef(onOpen);
  opened.current = onOpen;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const button = anchor.current?.querySelector('button');
    if (!button) return;
    const element = document.createElement('div');
    button.setAttribute('aria-haspopup', 'dialog');
    setContainer(element);
    const instance = tippy(button, {
      content: element, trigger: 'click', interactive: true, hideOnClick: true,
      appendTo: () => document.body, placement: 'top-start', arrow: false,
      theme: 'swttch-dropdown', role: 'dialog', maxWidth: 'none', duration: [120, 80],
      aria: { content: null, expanded: false },
      onShow: instance => { hideAll({ exclude: instance }); button.setAttribute('aria-expanded', 'true'); opened.current?.(); },
      onHide: () => { button.setAttribute('aria-expanded', 'false'); },
    });
    if (closeRef) closeRef.current = () => instance.hide();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && instance.state.isVisible) { instance.hide(); button.focus(); }
    };
    const blur = () => { if (document.activeElement instanceof HTMLIFrameElement) instance.hide(); };
    document.addEventListener('keydown', escape);
    window.addEventListener('blur', blur);
    return () => {
      instance.destroy(); if (closeRef) closeRef.current = null;
      document.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
    };
  }, [closeRef]);
  return <><span ref={anchor} className="tooltip-anchor">{children}</span>{container && createPortal(content, container)}</>;
}
