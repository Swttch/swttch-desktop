export enum DesktopPhase {
  Starting = 'starting',
  Ready = 'ready',
  Chat = 'chat',
  Error = 'error',
}

export interface Project {
  id: number;
  projectId: number | null;
  sessionsExpanded: boolean;
  path: string;
  alias: string | null;
  description: string | null;
  favoritedAt: number;
  hiddenAt: number;
  createdAt: number;
  lastModified: number;
  sessionCount: number;
}

export interface ProjectSessionScope { includeNestedSessions: boolean; projects: Project[] }

export enum SessionActivity { Idle = 'idle', Running = 'running', Awaiting = 'awaiting', Done = 'done' }
export interface SessionPage { sessions: SessionListEntry[]; hasMore: boolean; total: number; nextOffset: number; scopeDirCount: number; serviceError?: { reason: string } }

export interface DesktopState {
  phase: DesktopPhase;
  message: string;
  project: string | null;
  recent: string[];
  projects: Project[];
  chatUrl: string | null;
  backendId: string;
  sessionActivity?: { activity: Record<string, SessionActivity>; open: string[] };
  sessionsRevision?: number;
  activityRevision?: number;
}

// Original GET_SESSIONS entry fields; the transport retains the full payload.
export interface SessionListEntry {
  sessionId: string;
  sessionDir: string;
  title: string;
  lastTimestamp: string | null;
  createdAt: string;
  favoritedAt: number;
  isOpen?: boolean;
  activity?: SessionActivity;
  messageCount: number | null;
  isSidechain: boolean;
}

declare global {
  interface Window {
    desktopHost?: {
      folderPath: (file: File) => string;
      selectDirectory: () => Promise<string | null>;
    };
  }
}
