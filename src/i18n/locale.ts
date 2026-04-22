export type Locale = "ko" | "en";

export const LOCALE_STORAGE_KEY = "church_erp_locale";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export const localeFlags: Record<Locale, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
};

export const localeCountryNames: Record<Locale, { ko: string; en: string }> = {
  ko: { ko: "한국", en: "Korea" },
  en: { ko: "미국", en: "USA" },
};

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  return "en";
}

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ko" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return detectBrowserLocale();
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
