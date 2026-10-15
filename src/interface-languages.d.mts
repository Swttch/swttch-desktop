export const interfaceLanguages: { value: string; locale: string; label: string }[];
export function interfaceLocale(language: string): string;
export function interfaceDirection(language: string, direction: 'auto' | 'ltr' | 'rtl'): 'ltr' | 'rtl';
