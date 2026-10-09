import claudeLogo from './assets/claude-logo.svg';
import { SessionActivity } from './desktop';
import { SessionStatus } from './SessionStatus';

export function SessionProviderIcon({ opened, activity, selected }: { opened: boolean; activity: SessionActivity; selected: boolean }) {
  return <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-selected">
    <img src={claudeLogo} alt="Claude" className="size-6" />
    {opened && <span className={`absolute -bottom-1 -right-1 flex rounded-full p-0.5 ${selected ? 'bg-selected' : 'bg-canvas group-hover:bg-hover group-focus-within:bg-hover'}`}><SessionStatus opened={opened} activity={activity} /></span>}
  </span>;
}
