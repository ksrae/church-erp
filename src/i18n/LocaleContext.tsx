import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Locale, getStoredLocale, storeLocale } from "./locale";
import { translate, TranslationKey } from "./translations";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ko",
  setLocale: () => {},
  t: (key) => key as string,
});

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    storeLocale(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
