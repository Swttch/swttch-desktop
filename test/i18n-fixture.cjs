// UI behavior fixtures retain their Korean labels; language resolution is tested
// against the real i18next instance separately in interface-settings.test.cjs.
const { i18n: runtime } = require('../src/interface-i18n.mjs');
const { interfaceCatalogs } = require('../src/interface-copy.mjs');
module.exports = {
  t: key => String(runtime.getFixedT('ko', 'shell')(key)),
  useShellTranslation: () => ({ i18n: { language: 'ko' } }),
  useSettingsCopy: () => interfaceCatalogs.ko,
  i18n: { changeLanguage() {} },
};
