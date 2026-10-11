import type { AccountListItem } from '../../../../webview/src/shared/account';
export function AccountAvatar({ account, row = false }: { account?: AccountListItem; row?: boolean }) {
  const name = account?.displayName || account?.emailAddress || '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const char of account?.id || '') hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  // Preserve the plugin's Tailwind 3 palette across the desktop's Tailwind 4.
  const palette = ['#fb7185', '#ea580c', '#d97706', '#14b8a6', '#0ea5e9', '#a78bfa', '#f472b6', '#059669'];
  const color = account ? palette[Math.abs(hash) % palette.length] : undefined;
  return <span aria-hidden="true" style={{ backgroundColor: color }} className={`grid ${row ? 'size-6 text-[0.6153rem]' : 'size-5 text-[0.6153rem]'} shrink-0 place-items-center rounded-full ${account ? '' : 'bg-selected'} font-semibold uppercase leading-none text-white`}>{initials || <svg className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><circle cx="12" cy="8" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /></svg>}</span>;
}

export function AccountIdentity({ account }: { account: AccountListItem }) {
  return <><AccountAvatar account={account} row /><span className="min-w-0 flex-1"><span className="block truncate text-[0.8461rem] font-semibold leading-tight">{account.displayName || account.emailAddress}</span>{account.displayName && <span className="block truncate text-[0.7077rem] text-muted">{account.emailAddress}</span>}</span></>;
}
export function ActiveAccountMark() {
  return <svg aria-label="현재 계정" className="size-4 shrink-0 fill-none stroke-[#22c55e]" viewBox="0 0 24 24" strokeWidth="1.6"><path d="m4.5 12.75 6 6 9-13.5" /></svg>;
}
