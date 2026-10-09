import { SessionFavoriteButton } from './SessionFavoriteButton';
import { SessionTitle } from './SessionTitle';
import { SessionProviderIcon } from "./SessionProviderIcon";
import { useEffect, useRef, useState } from "react";
import { SessionActivity, type SessionListEntry } from "./desktop";
import { Tooltip } from "./Tooltip";
import { relativeTime, sessionDate, sessionOrigin } from "./session-utils";
export function SessionRow({ session, projectId, root, merged, opened, activity, selected, highlighted, busy, onOpen, onRename, onDelete }: {
  session: SessionListEntry; projectId: number; root: string; merged: boolean; opened: boolean; activity: SessionActivity;
  selected: boolean; highlighted: boolean; busy: boolean; onOpen: () => void; onRename: (title: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false), [title, setTitle] = useState(session.title || "");
  const row = useRef<HTMLDivElement>(null), cancelled = useRef(false);
  useEffect(() => { if (highlighted) row.current?.scrollIntoView({ block: "nearest" }); }, [highlighted]);
  const commit = () => { if (cancelled.current) return; cancelled.current = true; setEditing(false); const value = title.trim(); if (value && value !== session.title) onRename(value); };
  const origin = merged ? sessionOrigin(session.sessionDir, root) : "";
  return <div ref={row} className={`group flex min-h-11 items-center gap-2 rounded-md px-2 ${selected ? "bg-selected" : highlighted ? "bg-hover" : "hover:bg-hover focus-within:bg-hover"}`} data-session-id={session.sessionId}>
    <SessionProviderIcon opened={opened} activity={activity} selected={selected || highlighted} />
    <div className="session-title min-w-0 flex-1">
      <div className="py-2">{origin && <span className="mb-0.5 block truncate text-xs text-muted">{origin}</span>}<Tooltip content={editing ? '' : <><div>{session.title || "제목 없는 대화"}</div>{origin && <div className="mt-1 text-xs text-muted">{session.sessionDir}</div>}</>} delay={300}><span className="block w-full text-sm"><SessionTitle title={session.title} editing={editing} value={title} disabled={busy} onChange={setTitle} onCommit={commit} onCancel={() => { cancelled.current = true; setEditing(false); }} onOpen={onOpen} /></span></Tooltip></div>
    </div>
    {!editing && <><span className="shrink-0 text-xs text-muted group-hover:hidden group-focus-within:hidden">{relativeTime(sessionDate(session))}</span><div className="hidden shrink-0 gap-1 group-hover:flex group-focus-within:flex"><SessionFavoriteButton projectId={projectId} uid={session.sessionId} favoritedAt={session.favoritedAt} disabled={busy} /><Tooltip content="이름 변경" delay={0}><button className="icon-button size-7!" aria-label="이름 변경" disabled={busy} onClick={() => { cancelled.current = false; setTitle(session.title || ""); setEditing(true); }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 4 5 5-11 11H4v-5Z" /><path d="m13 6 5 5" /></svg></button></Tooltip><Tooltip content="세션 삭제" delay={0}><button className="icon-button size-7! hover:text-red-400" aria-label="세션 삭제" disabled={busy} onClick={onDelete}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></svg></button></Tooltip></div></>}
  </div>;
}
