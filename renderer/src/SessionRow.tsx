import { useEffect, useRef, useState } from "react";
import { SessionActivity, type SessionListEntry } from "./desktop";
import { Tooltip } from "./Tooltip";
import { relativeTime, sessionDate, sessionOrigin } from "./session-utils";
export const ACTIVITY_LABEL = { [SessionActivity.Idle]: "대기", [SessionActivity.Running]: "실행 중", [SessionActivity.Awaiting]: "응답 대기", [SessionActivity.Done]: "완료" };
export function SessionRow({ session, root, merged, opened, activity, selected, highlighted, busy, onOpen, onRename, onDelete }: {
  session: SessionListEntry; root: string; merged: boolean; opened: boolean; activity: SessionActivity;
  selected: boolean; highlighted: boolean; busy: boolean; onOpen: () => void; onRename: (title: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false), [title, setTitle] = useState(session.title || "");
  const input = useRef<HTMLInputElement>(null), row = useRef<HTMLDivElement>(null), cancelled = useRef(false);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  useEffect(() => { if (highlighted) row.current?.scrollIntoView({ block: "nearest" }); }, [highlighted]);
  const commit = () => { if (cancelled.current) return; cancelled.current = true; setEditing(false); const value = title.trim(); if (value && value !== session.title) onRename(value); };
  const origin = merged ? sessionOrigin(session.sessionDir, root) : "";
  return <div ref={row} className={`group flex min-h-11 items-center gap-2 rounded-md px-2 ${selected ? "bg-selected" : highlighted ? "bg-hover" : "hover:bg-hover focus-within:bg-hover"}`} data-session-id={session.sessionId}>
    {opened && <Tooltip content={ACTIVITY_LABEL[activity]} delay={0}><span aria-label={ACTIVITY_LABEL[activity]} className={`relative flex h-[14px] w-[14px] items-center justify-center ${activity === SessionActivity.Running ? "text-blue-400" : activity === SessionActivity.Awaiting ? "text-yellow-400" : activity === SessionActivity.Done ? "text-green-400" : "text-muted"}`}>{activity === SessionActivity.Running && <span className="absolute inset-0 animate-spin rounded-full border border-current border-b-transparent border-r-transparent" />}<span className="size-2 rounded-full bg-current" /></span></Tooltip>}
    <div className="session-title min-w-0 flex-1">
      {editing && origin && <span className="mb-0.5 block truncate text-xs text-muted">{origin}</span>}
      {editing ? <input ref={input} aria-label="세션 이름" className="field py-1! text-sm" value={title} disabled={busy} onChange={event => setTitle(event.target.value)} onBlur={commit} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); commit(); } else if (event.key === "Escape") { cancelled.current = true; setEditing(false); } }} /> : <Tooltip content={<><div>{session.title || "제목 없는 대화"}</div>{origin && <div className="mt-1 text-xs text-muted">{session.sessionDir}</div>}</>} delay={300}><button className="block w-full min-w-0 py-2 text-left" aria-current={selected ? "true" : undefined} disabled={busy} onClick={onOpen}>{origin && <span className="mb-0.5 block truncate text-xs text-muted">{origin}</span>}<span className="block truncate text-sm">{session.title || "제목 없는 대화"}</span></button></Tooltip>}
    </div>
    {!editing && <><span className="shrink-0 text-xs text-muted group-hover:hidden group-focus-within:hidden">{relativeTime(sessionDate(session))}</span><div className="hidden shrink-0 gap-1 group-hover:flex group-focus-within:flex"><Tooltip content="이름 변경" delay={0}><button className="icon-button size-7!" aria-label="이름 변경" disabled={busy} onClick={() => { cancelled.current = false; setTitle(session.title || ""); setEditing(true); }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 4 5 5-11 11H4v-5Z" /><path d="m13 6 5 5" /></svg></button></Tooltip><Tooltip content="세션 삭제" delay={0}><button className="icon-button size-7! hover:text-red-400" aria-label="세션 삭제" disabled={busy} onClick={onDelete}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></svg></button></Tooltip></div></>}
  </div>;
}
