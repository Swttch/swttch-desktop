import { useQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import { QUERY_KEY } from './query-client';
import { projectBadgeStyle, projectInitials } from './projects/projectBadge';

export function ProjectDetailPage({ projectId, disabled, onChat, onSession }: { projectId: string; disabled: boolean; onChat: (path: string) => void; onSession: (sessionId: string, path: string) => void }) {
  const project = useQuery({ queryKey: [...QUERY_KEY.projects, projectId], queryFn: ({ signal }) => desktopApi.project(projectId, signal) });
  const path = project.data?.path || '';
  const sessions = useQuery({ queryKey: QUERY_KEY.sessions(path), queryFn: ({ signal }) => desktopApi.listSessions(projectId, signal), enabled: !disabled && Boolean(project.data) });
  const name = project.data?.alias || path.split(/[\\/]/).filter(Boolean).pop() || path;
  return <main className="h-full overflow-y-auto px-6 py-8"><div className="mx-auto max-w-4xl">
    {project.isPending ? <p role="status" className="text-sm text-muted">프로젝트 불러오는 중…</p> : project.isError || project.data?.hiddenAt ? <div role="alert"><p>프로젝트를 불러오지 못했습니다.</p><button className="secondary-button mt-4" onClick={() => void project.refetch()}>재시도</button></div> : <>
      <div className="flex flex-wrap items-center gap-4"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-lg text-base font-semibold" style={projectBadgeStyle(path)}>{projectInitials(name)}</span><div className="min-w-0 flex-1"><h1 className="text-xl font-semibold">{name}</h1><p className="mt-1 break-all text-xs text-muted">{path}</p></div><button className="primary-button" disabled={disabled} onClick={() => onChat(path)}>새 채팅</button></div>
      {project.data?.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-muted">{project.data.description}</p>}
      <h2 className="mt-8 border-b border-divider pb-3 text-sm font-medium">세션</h2>
      {sessions.isPending ? <p role="status" className="py-8 text-sm text-muted">대화 불러오는 중…</p> : sessions.isError ? <div role="alert" className="py-8 text-sm text-muted">{sessions.error.message}<button className="ml-3 underline" onClick={() => void sessions.refetch()}>재시도</button></div> : sessions.data.sessions.filter(session => !session.isSidechain).map(session => <button key={session.sessionId} className="block w-full border-b border-divider py-4 text-left text-sm hover:bg-hover" disabled={disabled} onClick={() => onSession(session.sessionId, path)}>{session.title || '제목 없는 대화'}</button>)}
      {sessions.data?.sessions.length === 0 && <p className="py-8 text-sm text-muted">아직 대화가 없습니다. 새 채팅으로 작업을 시작하세요.</p>}
    </>}
  </div></main>;
}
