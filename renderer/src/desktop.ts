export enum DesktopPhase {
  Starting = 'starting',
  Ready = 'ready',
  Chat = 'chat',
  Error = 'error',
}

export interface Project {
  id: number;
  path: string;
  alias: string | null;
  description: string | null;
  favoritedAt: number;
  hiddenAt: number;
  createdAt: number;
  lastModified: number;
  sessionCount: number;
}

export interface DesktopState {
  phase: DesktopPhase;
  message: string;
  project: string | null;
  recent: string[];
  projects: Project[];
  chatUrl: string | null;
  backendId: string;
}

// Original GET_SESSIONS entry fields; the transport retains the full payload.
export interface SessionListEntry {
  sessionId: string;
  sessionDir: string;
  title: string;
  lastTimestamp: string | null;
  createdAt: string;
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
