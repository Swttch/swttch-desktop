export interface WorkspaceView { kind?: 'chat' | 'terminal'; terminalId?: string; id: string; url: string; projectId: number; projectPath: string; title: string; sessionId: string; customTitle?: string }
export interface WorkspacePanel { kind: 'panel'; id: string; tabs: WorkspaceView[]; activeTabId: string | null; focusHistory?: string[] }
export interface WorkspaceSplit { kind: 'split'; id: string; direction: 'columns' | 'rows'; ratio: number; children: [WorkspaceNode, WorkspaceNode] }
export type WorkspaceNode = WorkspacePanel | WorkspaceSplit;
export function panels(node: WorkspaceNode): WorkspacePanel[];
export function updatePanel(node: WorkspaceNode, id: string, update: (panel: WorkspacePanel) => WorkspaceNode): WorkspaceNode;
export function openTab(node: WorkspaceNode, panelId: string, tab: WorkspaceView): WorkspaceNode;
export function selectTab(node: WorkspaceNode, panelId: string, tabId: string): WorkspaceNode;
export function updateTab(node: WorkspaceNode, tabId: string, fields: Partial<WorkspaceView>): WorkspaceNode;
export function closeTabs(node: WorkspaceNode, panelId: string, ids: string[]): WorkspaceNode;
export function splitPanel(node: WorkspaceNode, panelId: string, tab: WorkspaceView, direction: 'columns' | 'rows', panelIdNew: string, splitId: string): WorkspaceNode;
export function resizeSplit(node: WorkspaceNode, id: string, ratio: number): WorkspaceNode;

export function moveTab(node: WorkspaceNode, tabId: string, targetPanelId: string, insertionIndex: number): WorkspaceNode;

export type PanelDropEdge = 'left' | 'right' | 'top' | 'bottom' | 'center';
export function panelDropEdge(x: number, y: number, width: number, height: number): PanelDropEdge;
export function moveTabToSplit(node: WorkspaceNode, tabId: string, targetPanelId: string, edge: PanelDropEdge, newPanelId: string, splitId: string): WorkspaceNode;
