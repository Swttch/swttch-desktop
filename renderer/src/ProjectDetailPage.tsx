import { t, useShellTranslation } from './i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { desktopApi } from './api';
import { ProjectSessionList } from './ProjectSessionList';
import { QUERY_KEY } from './query-client';
import { projectBadgeStyle, projectInitials } from './projects/projectBadge';
import { Tooltip } from './Tooltip';
import { NestedProjectsMenu } from './NestedProjectsMenu';
import type { Project } from './desktop';
import { PATH, replacePathParams } from './routes';
import { useRouter } from './router';

export function ProjectDetailPage({ projectId, disabled, onChat, onSession }: { projectId: string; disabled: boolean; onChat: (path: string) => void; onSession: (sessionId: string, path: string) => void }) { useShellTranslation();
  const client = useQueryClient();
  const router = useRouter();
  const project = useQuery({ queryKey: [...QUERY_KEY.projects, projectId], queryFn: ({ signal }) => desktopApi.project(projectId, signal) });
  const projects = useQuery({ queryKey: QUERY_KEY.projects, queryFn: ({ signal }) => desktopApi.projects(signal), enabled: project.data?.projectId != null });
  const ancestors: Project[] = [];
  const visited = new Set([project.data?.id]);
  let parentId = project.data?.projectId;
  while (parentId != null && !visited.has(parentId)) {
    const parent = projects.data?.projects.find(row => row.id === parentId);
    if (!parent) break;
    visited.add(parent.id); ancestors.push(parent); parentId = parent.projectId;
  }
  const parent = ancestors[0];
  const projectName = (row: Project) => row.alias || row.path.split(/[\\/]/).filter(Boolean).pop() || row.path;
  const scope = useQuery({ queryKey: QUERY_KEY.projectScope(projectId), queryFn: ({ signal }) => desktopApi.projectScope(projectId, signal), enabled: !disabled && Boolean(project.data) });
  const updateScope = useMutation({ mutationFn: (included: boolean) => desktopApi.updateProjectScope(projectId, included), onSuccess: next => {
    client.setQueryData(QUERY_KEY.projectScope(projectId), next);
    void client.invalidateQueries({ queryKey: QUERY_KEY.sessionList(projectId) });
  }, onError: error => toast.error(error.message) });
  const path = project.data?.path || '';
  const name = project.data?.alias || path.split(/[\\/]/).filter(Boolean).pop() || path;
  const includeNested = scope.data?.includeNestedSessions === true;
  const scopeDisabled = disabled || scope.isPending || scope.isError || updateScope.isPending;
  const copyPath = async () => { try { await navigator.clipboard.writeText(path); toast.success(t("Project path copied.")); } catch { toast.error(t("Could not copy path.")); } };
  return <main className="flex h-full min-h-0 flex-col px-6 py-8"><div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
    {project.isPending ? <p role="status" className="text-sm text-muted">{t("Loading projects…")}</p> : project.isError || project.data?.hiddenAt ? <div role="alert"><p>{t("Could not load projects.")}</p><button className="secondary-button mt-4" onClick={() => void project.refetch()}>{t("Retry")}</button></div> : <>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg text-base font-semibold" style={projectBadgeStyle(path)}>{projectInitials(name)}</span>
        <div className="min-w-40 flex-1">
          {parent && <Tooltip content={<><div className="text-xs text-muted">{t("Parent project")}</div><div className="mt-1 break-words">{[...ancestors].reverse().map(projectName).join(' / ')}</div></>} delay={0}>
            <button type="button" className="mb-1 flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 text-xs text-muted hover:bg-hover hover:text-foreground" aria-label={`${t("Parent project")}: ${projectName(parent)}`} onClick={() => router.push(replacePathParams(PATH.PROJECT, { projectId: parent.id }))}>
              <svg aria-hidden="true" className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 4-5 5 5 5M4 9h10a6 6 0 0 1 6 6v5" /></svg><span className="truncate">{projectName(parent)}</span>
            </button>
          </Tooltip>}
          <h1 className="break-words text-xl font-semibold">{name}</h1><Tooltip content={<><div>{t("Copy path")}</div><div className="mt-1 break-all text-xs text-muted">{path}</div></>} delay={0}><button className="mt-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-muted hover:bg-hover hover:text-foreground" aria-label={t("Copy project path")} onClick={() => void copyPath()}><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></svg>{t("Copy path")}</button></Tooltip>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-3">
          {includeNested && <NestedProjectsMenu key={projectId} root={path} projects={scope.data?.projects || []} disabled={scopeDisabled} />}
          <Tooltip content={t("Include sessions from subprojects")} delay={0}><div className="flex cursor-pointer items-center gap-2 text-xs text-muted"><span>{t("Include subprojects")}</span><button type="button" role="switch" aria-label={t("Include subprojects")} aria-checked={includeNested} disabled={scopeDisabled} onClick={() => updateScope.mutate(!includeNested)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:cursor-wait disabled:opacity-50 ${includeNested ? 'bg-blue-500' : 'bg-selected'}`}><span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${includeNested ? 'translate-x-4' : ''}`} /></button></div></Tooltip>
          <button className="primary-button" disabled={disabled} onClick={() => onChat(path)}>{t("New chat")}</button>
        </div>
      </div>
      {project.data?.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-muted">{project.data.description}</p>}
      {scope.isError ? <p role="alert" className="mt-4 text-sm text-red-400">{scope.error.message}<button className="ms-2 underline" onClick={() => void scope.refetch()}>{t("Retry")}</button></p> : <ProjectSessionList key={projectId} projectId={projectId} path={path} disabled={scopeDisabled} includeNested={includeNested} onSession={onSession} />}
    </>}
  </div></main>;
}
