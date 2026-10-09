import { useEffect, useRef } from 'react';
import type { SessionListEntry } from './desktop';
export function DeleteSessionDialog({ session, pending, error, onDelete, onClose }: { session: SessionListEntry; pending: boolean; error?: string; onDelete: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  return <dialog ref={dialog} aria-labelledby="session-delete-title" className="fixed inset-0 m-auto! w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-divider bg-navigation p-6 text-foreground shadow-2xl backdrop:bg-black/60" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <h2 id="session-delete-title" className="text-base font-semibold">세션 삭제</h2><p className="mt-4 break-words text-sm leading-6 text-muted">“{session.title || '제목 없는 대화'}” 세션을 삭제하시겠습니까? 대화 기록이 삭제되며 되돌릴 수 없습니다.</p>{error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button autoFocus className="secondary-button" disabled={pending} onClick={onClose}>취소</button><button className="primary-button bg-red-500! text-white!" disabled={pending} onClick={onDelete}>{pending ? '삭제 중…' : '삭제'}</button></div>
  </dialog>;
}
