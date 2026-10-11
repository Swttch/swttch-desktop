import claudeLogo from './assets/claude-logo.svg';
import { Tooltip } from './Tooltip';

export function WorkspaceTab({ title, selected, pending, onSelect, onClose }: { title: string; selected: boolean; pending: boolean; onSelect: () => void; onClose: () => void }) {
  return <div className={`workspace-tab group flex h-full min-w-0 max-w-60 shrink-0 items-center border-r border-divider border-b-2 ${selected ? 'border-b-muted bg-selected' : 'border-b-transparent hover:bg-hover'}`}>
    <Tooltip content={title} placement="bottom-start"><button id="current-chat-tab" type="button" role="tab" aria-selected={selected} aria-controls="viewport" className="flex h-full min-w-0 items-center gap-2 px-3 text-xs" onClick={onSelect}><img src={claudeLogo} alt="Claude" className="size-3 shrink-0" /><span className="max-w-40 truncate">{title}</span></button></Tooltip>
    <Tooltip content="탭 닫기" placement="bottom-end"><button type="button" aria-label="채팅 탭 닫기" disabled={pending} className="mr-1 flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground" onClick={onClose}><svg aria-hidden="true" className="size-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></Tooltip>
  </div>;
}
