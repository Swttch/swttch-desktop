import { t, useShellTranslation } from './i18n';
import { Tooltip } from './Tooltip';

export function RefreshButton({ pending, onClick, label = t("Refresh usage"), small = false }: { pending: boolean; onClick: () => void; label?: string; small?: boolean }) { useShellTranslation();
  return <Tooltip content={label} placement="top-start"><button type="button" className="icon-button size-6" aria-label={label} disabled={pending} onClick={onClick}><svg aria-hidden="true" viewBox="0 0 24 24" className={`${small ? 'size-3' : 'size-4'} fill-none stroke-current ${pending ? 'animate-spin motion-reduce:animate-none' : ''}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button></Tooltip>;
}
