import { useTranslation } from 'react-i18next';
import { i18n, t } from '../../src/interface-i18n.mjs';
import { interfaceCatalogs, type InterfaceCopy } from '../../src/interface-copy.mjs';
export { i18n, t };
export function useSettingsCopy(): InterfaceCopy {
  const { t } = useTranslation();
  return Object.fromEntries(Object.keys(interfaceCatalogs.en).map(key => [key, t(key)])) as InterfaceCopy;
}
export function useShellTranslation() { return useTranslation('shell'); }
