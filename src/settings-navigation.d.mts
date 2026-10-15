export const settingsItems: readonly { path?: string; label: string; group: string; icon: string; description: string; disabled?: boolean }[];
export function findSettings(query: string): typeof settingsItems;
export function resolveSettingsPath(path: string): string;
export function isShellSettingsRequest(requestUrl: string): boolean;
