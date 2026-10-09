import { PATH } from '../../src/paths.mjs';
export { PATH };

/** Replace required :parameters as URL-safe path segments. */
export function replacePathParams(path: string, params: Readonly<Record<string, string | number>>) {
  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_, key: string) => {
    if (!Object.hasOwn(params, key) || String(params[key]).length === 0) throw new Error(`Missing path parameter: ${key}`);
    return encodeURIComponent(String(params[key]));
  });
}
