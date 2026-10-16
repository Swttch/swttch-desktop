export function SettingsLoading({ label }: { label: string }) {
  return <div role="status" className="flex items-center gap-3 py-6 text-sm text-muted"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 animate-spin motion-reduce:animate-none fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="12" r="9" opacity="0.2" /><path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" /></svg><span>{label}</span></div>;
}
