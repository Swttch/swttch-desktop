import { t, useShellTranslation } from './i18n';
import { useEffect, useRef } from 'react';

export function SessionTitle({ title, editing, value, disabled, onChange, onCommit, onCancel, onOpen }: {
  title: string; editing: boolean; value: string; disabled: boolean;
  onChange: (value: string) => void; onCommit: () => void; onCancel: () => void; onOpen: () => void;
}) { useShellTranslation();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  return <span className="relative block min-w-0 w-full">
    {editing ? <><input ref={input} aria-label={t("Session name")} className="block w-full min-w-0 border-0 bg-transparent p-0 text-inherit leading-[inherit] outline-none" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} onBlur={onCommit} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); onCommit(); } else if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }} /><span className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-px bg-blue-400" /></> : <button className="block w-full min-w-0 truncate p-0 text-start leading-[inherit]" disabled={disabled} onClick={onOpen}>{title || t("Untitled chat")}</button>}
  </span>;
}
