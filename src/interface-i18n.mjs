import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { interfaceCatalogs } from './interface-copy.mjs';
import { shellCatalogs } from './shell-catalogs.mjs';
import { interfaceLanguages } from './interface-languages.mjs';
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(interfaceCatalogs).map(([locale, translation]) => [locale, { translation, shell: shellCatalogs[locale] }])),
  lng: 'en', fallbackLng: 'en', defaultNS: 'translation', keySeparator: false, nsSeparator: false, supportedLngs: interfaceLanguages.map(item => item.locale),
  interpolation: { escapeValue: false }, returnNull: false,
});
export { i18n };
export const t = (key, values = {}) => String(i18n.t(key, { ns: 'shell', ...values }));
