export type SettingValue = string | number | boolean | null | SettingValue[] | { [key: string]: SettingValue };
export type ProviderSettingsRecord = { settings: Record<string, SettingValue>; effectiveSettings: Record<string, SettingValue>; overrides: string[] };
export enum ProviderScope { Global = 'global', Project = 'project' }
export function providerField(data: ProviderSettingsRecord | undefined, scope: ProviderScope, key: string, fallback: SettingValue): { value: SettingValue; inherited: boolean; shadowed: boolean };

export type ProviderModel = { value: string; supportsAutoMode?: boolean; displayName?: string; resolvedModel?: string; supportedEffortLevels?: string[] };
export type ProviderCatalog = { controlResponse?: { response?: { response?: { models?: ProviderModel[] } } } };
export function providerModelOptions(models: ProviderModel[], current: string, defaultLabel: string): { value: string; label: string }[];
export function providerEffortOptions(models: ProviderModel[], model: string, autoLabel: string): { value: string; label: string }[];
export function settingObject(value: SettingValue | undefined): Record<string, SettingValue>;
export function updateProviderEntry(value: SettingValue | undefined, key: string, next: SettingValue): SettingValue;
export function fileSuggestionValue(value: SettingValue | undefined, command: string): SettingValue;
export function spinnerVerbsValue(value: SettingValue | undefined, mode: string, verbs: string[]): SettingValue;

export function providerNestedField(data: ProviderSettingsRecord | undefined, scope: ProviderScope, parent: string, key: string, fallback: SettingValue): { value: SettingValue; inherited: boolean; shadowed: boolean };
