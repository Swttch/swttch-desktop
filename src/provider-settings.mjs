export const ProviderScope = Object.freeze({ Global: 'global', Project: 'project' });
export function providerField(data, scope, key, fallback) {
  const own = data?.settings?.[key];
  const inherited = scope === 'project' && (own === undefined || own === null);
  return {
    value: (inherited ? data?.effectiveSettings?.[key] : own) ?? fallback,
    inherited,
    shadowed: scope === 'global' && (data?.overrides || []).includes(key),
  };
}

export function providerModelOptions(models, current, defaultLabel) {
  const choices = [{ value: '', label: defaultLabel }, ...models.filter(model => model.value && model.value !== 'default').map(model => ({ value: model.value, label: model.resolvedModel || model.displayName || model.value }))];
  if (current && !choices.some(option => option.value === current)) choices.push({ value: current, label: current });
  return choices;
}
export function providerEffortOptions(models, model, autoLabel) {
  const selected = models.find(row => row.value === (model || 'default'));
  return [{ value: '', label: autoLabel }, ...(selected?.supportedEffortLevels || []).map(value => ({ value, label: value }))];
}
export function settingObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
export function updateProviderEntry(value, key, next) {
  if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid setting name');
  const result = { ...settingObject(value) };
  if (next === null) delete result[key]; else result[key] = next;
  return Object.keys(result).length ? result : null;
}
export function fileSuggestionValue(value, command) {
  return command.trim() ? { ...settingObject(value), type: 'command', command: command.trim() } : null;
}
export function spinnerVerbsValue(value, mode, verbs) {
  const cleaned = verbs.map(verb => verb.trim()).filter(Boolean);
  return cleaned.length ? { ...settingObject(value), mode, verbs: cleaned } : null;
}

export function providerNestedField(data, scope, parent, key, fallback) {
  const own = settingObject(data?.settings?.[parent])[key];
  const effective = settingObject(data?.effectiveSettings?.[parent])[key];
  const inherited = scope === ProviderScope.Project && own == null;
  return { value: (inherited ? effective : own) ?? fallback, inherited,
    shadowed: scope === ProviderScope.Global && (data?.overrides || []).includes(parent) && JSON.stringify(effective) !== JSON.stringify(own) };
}
