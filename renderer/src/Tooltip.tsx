import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import tippy, { type Instance, type Props } from 'tippy.js';

export function Tooltip({ content, children, placement = 'bottom-start', delay = 300, disabled = false }: { content: ReactNode; children: ReactNode; placement?: Props['placement']; delay?: number; disabled?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!anchor.current) return;
    const element = document.createElement('div');
    setContainer(element);
    const instance = tippy(anchor.current, {
      content: element, placement, delay: [delay, 0], duration: [120, 80],
      theme: 'swttch', maxWidth: 360, trigger: 'mouseenter focusin', hideOnClick: true,
      onShow: instance => {
        // Hover tooltips must not dismiss an interactive dropdown.
        for (const root of document.querySelectorAll<HTMLElement & { _tippy?: Instance }>('[data-tippy-root]')) {
          const other = root._tippy;
          if (other && other !== instance && !other.props.interactive) other.hide();
        }
      },
    });
    if (disabled) instance.disable();
    return () => instance.destroy();
  }, [placement, delay, disabled]);
  return <><span ref={anchor} className="tooltip-anchor">{children}</span>{container && createPortal(content, container)}</>;
}
