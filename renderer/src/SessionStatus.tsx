import { SessionActivity } from './desktop';
import { Tooltip } from './Tooltip';

export const ACTIVITY_LABEL = { [SessionActivity.Idle]: '대기', [SessionActivity.Running]: '실행 중', [SessionActivity.Awaiting]: '응답 대기', [SessionActivity.Done]: '완료' };

export function SessionStatus({ opened, activity }: { opened: boolean; activity: SessionActivity }) {
  if (!opened) return null;
  return <Tooltip content={ACTIVITY_LABEL[activity]} delay={0}><span aria-label={ACTIVITY_LABEL[activity]} className={`relative flex size-[14px] shrink-0 items-center justify-center ${activity === SessionActivity.Running ? 'text-blue-400' : activity === SessionActivity.Awaiting ? 'text-yellow-400' : activity === SessionActivity.Done ? 'text-green-400' : 'text-muted'}`}>{activity === SessionActivity.Running && <span className="absolute inset-0 animate-spin rounded-full border border-current border-b-transparent border-r-transparent" />}<span className="size-2 rounded-full bg-current" /></span></Tooltip>;
}
