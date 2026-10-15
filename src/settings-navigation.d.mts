export const settingsItems: readonly { path?: string; label: string; group: string; icon: string; description: string; disabled?: boolean }[];
export function findSettings(query: string, copy?: Record<string, string>): typeof settingsItems;
export function resolveSettingsPath(path: string): string;
export function isShellSettingsRequest(requestUrl: string): boolean;

export function getSettingsItems(copy: Record<string, string>): typeof settingsItems;
