import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { desktopApi } from './api';
import { SessionActivity, type SessionListEntry } from './desktop';
import { QUERY_KEY } from './query-client';
import { Tooltip } from './Tooltip';
import { SessionStatus } from './SessionStatus';
import { SessionTitle } from './SessionTitle';
import { DeleteSessionDialog } from './DeleteSessionDialog';

export function SidebarSessionRow({ session, projectId, selected, disabled, onOpen }: {
  session: SessionListEntry; projectId: number; selected: boolean; disabled: boolean; onOpen: () => void;
}) {
  const client = useQueryClient();
  const workspace = useQuery({ queryKey: QUERY_KEY.workspace, queryFn: ({ signal }) => desktopApi.state(signal) });
  const activity = workspace.data?.sessionActivity;
  const [editing, setEditing] = useState(false), [value, setValue] = useState(session.title || ''), [deleting, setDeleting] = useState(false);
  const finished = useRef(false);
  const refresh = () => void client.invalidateQueries({ queryKey: QUERY_KEY.sessionLists });
  const rename = useMutation({ mutationFn: (title: string) => desktopApi.renameSession(String(projectId), session.sessionId, title), onSuccess: refresh, onError: error => toast.error(error.message) });
  const remove = useMutation({ mutationFn: () => desktopApi.deleteSession(String(projectId), session.sessionId), onSuccess: () => { setDeleting(false); refresh(); }, onError: error => toast.error(error.message) });
  const commit = () => { if (finished.current) return; finished.current = true; setEditing(false); const title = value.trim(); if (title && title !== session.title) rename.mutate(title); };
  return <>
    <div className={`session-row group relative flex! items-center ${selected ? 'selected' : ''}`} data-sidebar-session-id={session.sessionId}>
      <span className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center"><SessionStatus opened={session.isOpen ?? (activity?.open.includes(session.sessionId) || false)} activity={session.activity ?? activity?.activity[session.sessionId] ?? SessionActivity.Idle} /></span>
      <div className={`min-w-0 flex-1 ${editing ? '' : 'group-hover:pr-12 group-focus-within:pr-12'}`}><Tooltip content={editing ? '' : session.title}><SessionTitle title={rename.isPending ? value.trim() : session.title} editing={editing} value={value} disabled={disabled || rename.isPending} onChange={setValue} onCommit={commit} onCancel={() => { finished.current = true; setEditing(false); }} onOpen={onOpen} /></Tooltip></div>
      {!editing && <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex group-focus-within:flex">
        <Tooltip content="이름 변경" delay={0}><button aria-label="이름 변경" className="icon-button size-6!" disabled={disabled || rename.isPending} onClick={() => { finished.current = false; setValue(session.title || ''); setEditing(true); }}><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 4 5 5-11 11H4v-5Z" /><path d="m13 6 5 5" /></svg></button></Tooltip>
        <Tooltip content="세션 삭제" delay={0}><button aria-label="세션 삭제" className="icon-button size-6! hover:text-red-400" disabled={disabled} onClick={() => { remove.reset(); setDeleting(true); }}><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></svg></button></Tooltip>
      </div>}
    </div>
    {deleting && <DeleteSessionDialog session={session} pending={remove.isPending} error={remove.error?.message} onDelete={() => remove.mutate()} onClose={() => { if (!remove.isPending) setDeleting(false); }} />}
  </>;
}
