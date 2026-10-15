import { t, useShellTranslation } from './i18n';
import { useEffect, useRef } from 'react';
import type { SessionListEntry } from './desktop';
export function DeleteSessionDialog({ session, pending, error, onDelete, onClose }: { session: SessionListEntry; pending: boolean; error?: string; onDelete: () => void; onClose: () => void }) { useShellTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  return <dialog ref={dialog} aria-labelledby="session-delete-title" className="fixed inset-0 m-auto! w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-divider bg-navigation p-6 text-foreground shadow-2xl backdrop:bg-black/60" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <h2 id="session-delete-title" className="text-base font-semibold">{t("Delete session")}</h2><p className="mt-4 break-words text-sm leading-6 text-muted">“{session.title || t("Untitled chat")}{t("”? Chat history will be permanently deleted.")}</p>{error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button autoFocus className="secondary-button" disabled={pending} onClick={onClose}>{t("Cancel")}</button><button className="primary-button bg-red-500! text-white!" disabled={pending} onClick={onDelete}>{pending ? t("Deleting…") : t("Delete")}</button></div>
  </dialog>;
}
