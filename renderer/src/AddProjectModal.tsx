import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ProjectDialog } from './ProjectDialog';
import { desktopApi } from './api';
import { queryClient, QUERY_KEY } from './query-client';

export function AddProjectModal({ onClose, onAdded }: { onClose: () => void; onAdded: (projectId: number) => void }) {
  const [path, setPath] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const picker = useMutation({ mutationFn: desktopApi.selectFolder });
  const create = useMutation({ mutationFn: desktopApi.createProject, onSuccess: project => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.workspace });
    onAdded(project.id);
  } });
  const busy = picker.isPending || create.isPending;
  async function choose(expectedName?: string) {
    setError('');
    try {
      const result = await picker.mutateAsync();
      if (!result.path) return;
      if (expectedName && result.path.split(/[\\/]/).pop() !== expectedName) { setError('드롭한 폴더와 선택한 폴더가 다릅니다. 같은 폴더를 선택해 주세요.'); return; }
      setPath(result.path); setNotice('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '폴더를 선택하지 못했습니다.'); }
  }
  return <ProjectDialog project={{ path, alias: null, description: null }} creating pending={busy} canSave={Boolean(path)} error={error} notice={notice} onClose={onClose} onSave={(alias, description) => {
    setError(''); create.mutate({ path, alias, description }, { onError: cause => setError(cause.message) });
  }}>
    <p className="mt-2 text-sm leading-6 text-muted">{path ? '이름과 설명을 입력한 뒤 프로젝트를 추가하세요.' : '작업할 폴더를 드롭하거나 선택하세요.'}</p>
    <button type="button" disabled={busy} className={`mt-5 flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${path ? '' : 'min-h-32 justify-center border-dashed'} ${dragging ? 'border-foreground bg-selected' : 'border-divider hover:border-muted hover:bg-hover'}`} onClick={() => void choose()} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => {
      event.preventDefault(); setDragging(false); if (busy) return;
      const items = Array.from(event.dataTransfer.items).filter(item => item.kind === 'file');
      const entry = items[0]?.webkitGetAsEntry();
      if (items.length !== 1 || !entry?.isDirectory) { setError('폴더 하나를 드롭해 주세요. 파일은 프로젝트로 추가할 수 없습니다.'); return; }
      const file = items[0].getAsFile();
      const nativePath = file && window.desktopHost?.folderPath(file);
      if (nativePath) { setPath(nativePath); setError(''); return; }
      setNotice('브라우저에서 경로를 확인하려면 폴더 선택창에서 드롭한 폴더를 선택해 주세요.');
      void choose(entry.name);
    }}>
      <svg aria-hidden="true" className="size-6 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 7V5h6l2 2h10v13H3z" /></svg>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{picker.isPending ? '폴더 선택창에서 선택해 주세요' : path ? path.split(/[\\/]/).pop() : '폴더를 드롭하거나 클릭하여 선택'}</span><span className="mt-1 block break-all text-xs leading-5 text-muted">{path || '프로젝트 폴더 선택창 열기'}</span></span>
      {path && <span className="shrink-0 text-xs text-muted">변경</span>}
    </button>
  </ProjectDialog>;
}
