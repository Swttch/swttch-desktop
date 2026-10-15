export const interfaceLanguages = [
  ['english', 'en', 'English'], ['korean', 'ko', '한국어'], ['japanese', 'ja', '日本語'], ['chinese', 'zh', '简体中文'], ['chinese-traditional', 'zh-TW', '繁體中文'], ['spanish', 'es', 'Español'], ['french', 'fr', 'Français'], ['german', 'de', 'Deutsch'], ['portuguese', 'pt', 'Português'], ['russian', 'ru', 'Русский'], ['persian', 'fa', 'فارسی'], ['arabic', 'ar', 'العربية'],
].map(([value, locale, label]) => ({ value, locale, label }));
export const interfaceLocale = language => interfaceLanguages.find(item => item.value === language)?.locale || 'en';
export const interfaceDirection = (language, direction) => direction === 'auto' ? (['ar', 'fa'].includes(interfaceLocale(language)) ? 'rtl' : 'ltr') : direction;
