import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Project } from './desktop';

export function ProjectDialog({ project, deleting = false, creating = false, pending, canSave = true, children, error, notice, onSave, onDelete, onClose }: {
  project: Pick<Project, 'path' | 'alias' | 'description'>; deleting?: boolean; creating?: boolean; pending: boolean; canSave?: boolean;
  children?: ReactNode; error?: string; notice?: string;
  onSave: (alias: string, description: string) => void; onDelete?: () => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [alias, setAlias] = useState(project.alias || '');
  const [description, setDescription] = useState(project.description || '');
  const folderName = project.path.split(/[\\/]/).filter(Boolean).pop() || project.path;
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  useEffect(() => { if (creating && project.path) nameInput.current?.focus(); }, [creating, project.path]);
  return <dialog ref={dialog} aria-labelledby="project-dialog-title" className="fixed inset-0 m-auto! max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-divider bg-navigation p-6 text-foreground shadow-2xl backdrop:bg-black/60" onCancel={event => { if (pending) event.preventDefault(); else onClose(); }} onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); if (pending || !canSave) return; if (deleting) onDelete?.(); else onSave(alias.trim(), description.trim()); }}>
      <h2 id="project-dialog-title" className="text-base font-semibold">{deleting ? '프로젝트 삭제' : creating ? '프로젝트 추가' : '프로젝트 수정'}</h2>
      {children}
      {deleting ? <p className="mt-4 text-sm leading-6 text-muted">“{project.alias || folderName}” 프로젝트의 세션 기록을 ~/.claude/projects에서 삭제합니다. 되돌릴 수 없습니다. 프로젝트 폴더 자체는 삭제하지 않습니다.</p> : <>
        {!creating && <p className="mt-1 truncate text-xs text-muted">{folderName}</p>}
        {(!creating || project.path) && <><label className="mt-5 block text-xs text-muted">표시 이름<input ref={nameInput} autoFocus={!creating} disabled={pending} className="field mt-2" placeholder={folderName} value={alias} onChange={event => setAlias(event.target.value)} /></label>
          <p className="mt-2 text-xs text-muted">비워두면 실제 폴더 이름을 그대로 씁니다.</p>
          <label className="mt-5 block text-xs text-muted">설명<textarea disabled={pending} className="field mt-2 resize-none" rows={3} placeholder="이 프로젝트에 대한 메모를 입력하세요 (선택)" value={description} onChange={event => setDescription(event.target.value)} /></label></>}
      </>}
      {(error || notice) && <p className={`mt-3 text-xs leading-5 ${error ? 'text-red-400' : 'text-muted'}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={pending} className="secondary-button" onClick={onClose}>취소</button><button type="submit" disabled={pending || !canSave} autoFocus={deleting} className={`primary-button ${deleting ? 'bg-red-500! text-white!' : ''}`}>{pending ? '처리 중…' : deleting ? '삭제' : creating ? '프로젝트 추가' : '저장'}</button></div>
    </form>
  </dialog>;
}
