import { interfaceDirection } from './interface-languages.mjs';

// Reuse the plugin's existing settings protocol. Storage ownership stays there.
export function createSettingsPropagation({ read, request }) {
  let pending = Promise.resolve();
  return patch => {
    const languageChanged = Object.hasOwn(patch.general || {}, 'language');
    const directionChanged = Object.hasOwn(patch.general || {}, 'direction');
    if (!languageChanged && !directionChanged) return Promise.resolve(undefined);
    const run = async () => {
      const errors = [];
      try {
        // Resolve at execution time so queued requests use current desktop values.
        const { language, direction } = read().general;
        const commands = [
          ...(languageChanged ? [{ key: 'uiLanguage', value: language }] : []),
          { key: 'uiDirection', value: interfaceDirection(language, direction) },
        ];
        for (const command of commands) {
          try {
            const result = await request('SAVE_SETTINGS', { ...command, scope: 'global' });
            if (result?.status !== 'ok') throw new Error(result?.error || 'Plugin settings update failed');
          } catch (error) { errors.push({ key: command.key, message: error.message }); }
        }
      } catch (error) { errors.push({ key: 'general', message: error.message }); }
      return errors.length ? { status: 'failed', errors } : { status: 'synced' };
    };
    const result = pending.then(run);
    pending = result.then(() => {}, () => {});
    return result;
  };
}
