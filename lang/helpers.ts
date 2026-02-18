import en from './locale/en';

const localeMap: { [k: string]: Partial<typeof en> } = {
    en,
};

export function t(key: keyof typeof en): string {
    return localeMap['en']?.[key] ?? key;
}
