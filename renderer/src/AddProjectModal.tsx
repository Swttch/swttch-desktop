import { t, useShellTranslation } from './i18n';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ProjectDialog } from './ProjectDialog';
import { desktopApi } from './api';
import { queryClient, QUERY_KEY } from './query-client';

export function AddProjectModal({ onClose, onAdded }: { onClose: () => void; onAdded: (projectId: number) => void }) { useShellTranslation();
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
      if (expectedName && result.path.split(/[\\/]/).pop() !== expectedName) { setError(t("Choose the same folder that you dropped.")); return; }
      setPath(result.path); setNotice('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("Could not select the folder.")); }
  }
  return <ProjectDialog project={{ path, alias: null, description: null }} creating pending={busy} canSave={Boolean(path)} error={error} notice={notice} onClose={onClose} onSave={(alias, description) => {
    setError(''); create.mutate({ path, alias, description }, { onError: cause => setError(cause.message) });
  }}>
    <p className="mt-2 text-sm leading-6 text-muted">{path ? t("Enter a name and description to add the project.") : t("Drop or select a folder to work in.")}</p>
    <button type="button" disabled={busy} className={`mt-5 flex w-full items-center gap-3 rounded-lg border p-4 text-start transition-colors ${path ? '' : 'min-h-32 justify-center border-dashed'} ${dragging ? 'border-foreground bg-selected' : 'border-divider hover:border-muted hover:bg-hover'}`} onClick={() => void choose()} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => {
      event.preventDefault(); setDragging(false); if (busy) return;
      const items = Array.from(event.dataTransfer.items).filter(item => item.kind === 'file');
      const entry = items[0]?.webkitGetAsEntry();
      if (items.length !== 1 || !entry?.isDirectory) { setError(t("Drop one folder. Files cannot be added as projects.")); return; }
      const file = items[0].getAsFile();
      const nativePath = file && window.desktopHost?.folderPath(file);
      if (nativePath) { setPath(nativePath); setError(''); return; }
      setNotice(t("Select the dropped folder in the folder picker to confirm its path."));
      void choose(entry.name);
    }}>
      <svg aria-hidden="true" className="size-6 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 7V5h6l2 2h10v13H3z" /></svg>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{picker.isPending ? t("Select in the folder picker") : path ? path.split(/[\\/]/).pop() : t("Drop a folder or click to select")}</span><span className="mt-1 block break-all text-xs leading-5 text-muted">{path || t("Open project folder picker")}</span></span>
      {path && <span className="shrink-0 text-xs text-muted">{t("Change")}</span>}
    </button>
  </ProjectDialog>;
}
