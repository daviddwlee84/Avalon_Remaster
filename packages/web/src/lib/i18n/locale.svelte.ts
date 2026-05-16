import { LOCALES, type Locale, detectInitialLocale, lookup } from './messages';

const STORAGE_KEY = 'avalon.locale';

function loadStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && (LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  return null;
}

class LocaleStore {
  current: Locale = $state('zh-TW');

  /** Call from a layout's onMount so SSR doesn't see localStorage. */
  hydrate(): void {
    this.current = loadStoredLocale() ?? detectInitialLocale();
  }

  setLocale(next: Locale): void {
    this.current = next;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
    if (typeof document !== 'undefined') {
      // Use the BCP-47 tag verbatim — browsers + screen readers know
      // zh-TW vs zh-CN affects glyph selection and TTS voice.
      document.documentElement.lang = next;
    }
  }
}

export const localeStore = new LocaleStore();

/** Get a fresh translator bound to the current locale. */
export function t(key: string, vars?: Record<string, string | number>): string {
  return lookup(localeStore.current, key, vars);
}

export type { Locale };
export { LOCALES };
