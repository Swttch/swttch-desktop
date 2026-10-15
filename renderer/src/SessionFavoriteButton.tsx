import { t, useShellTranslation } from './i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { desktopApi } from './api';
import { QUERY_KEY } from './query-client';
import { Tooltip } from './Tooltip';

export function SessionFavoriteButton({ projectId, uid, favoritedAt, disabled, compact = false }: { projectId: number; uid: string; favoritedAt: number; disabled: boolean; compact?: boolean }) { useShellTranslation();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (favorite: boolean) => desktopApi.favoriteSession(String(projectId), uid, favorite), onSuccess: () => void client.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }), onError: error => toast.error(error.message) });
  const favorite = mutation.isPending ? mutation.variables : favoritedAt > 0;
  const label = favorite ? t("Remove from favorites") : t("Add to favorites");
  return <Tooltip content={label} delay={0}><button type="button" aria-label={label} aria-pressed={favorite} disabled={disabled || mutation.isPending} onClick={() => mutation.mutate(!favorite)} className={`icon-button ${favorite ? 'text-yellow-400!' : 'text-muted hover:text-foreground'} ${compact ? 'size-6!' : 'size-7!'}`}>
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.8 5.7 6.3.9-4.55 4.44 1.08 6.26L12 17.34l-5.63 2.96 1.08-6.26L2.9 9.6l6.3-.9Z" /></svg>
  </button></Tooltip>;
}
