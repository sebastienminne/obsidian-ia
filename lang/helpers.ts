import { moment } from 'obsidian';
import en from './locale/en';

const localeMap: { [k: string]: Partial<typeof en> } = {
    en,
};

const locale = moment.locale();

export function t(key: keyof typeof en): string {
    // If we had other languages, we would check localeMap[locale] here
    // For now, it falls back to 'en'
    return (localeMap['en'] as any)[key] || key;
}
