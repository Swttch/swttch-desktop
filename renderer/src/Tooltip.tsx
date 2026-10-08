import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import tippy, { hideAll, type Props } from 'tippy.js';

export function Tooltip({ content, children, placement = 'bottom-start', delay = 300 }: { content: ReactNode; children: ReactNode; placement?: Props['placement']; delay?: number }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!anchor.current) return;
    const element = document.createElement('div');
    setContainer(element);
    const instance = tippy(anchor.current, {
      content: element, placement, delay: [delay, 0], duration: [120, 80],
      theme: 'swttch', maxWidth: 360, trigger: 'mouseenter focusin', hideOnClick: true,
      onShow: instance => hideAll({ exclude: instance }),
    });
    return () => instance.destroy();
  }, [placement, delay]);
  return <><span ref={anchor} className="tooltip-anchor">{children}</span>{container && createPortal(content, container)}</>;
}
