import type en from './locales/interface/en.json';
export type InterfaceCopy = typeof en;
export const interfaceCatalogs: Record<string, Partial<InterfaceCopy>>;
