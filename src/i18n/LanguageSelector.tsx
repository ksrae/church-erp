import { useLocale } from "./LocaleContext";
import { Locale, localeFlags, localeLabels } from "./locale";

interface LanguageSelectorProps {
  /** "compact" = flag + code only (for headers); "full" = flag + name (for settings). */
  variant?: "compact" | "full";
  /** Optional style overrides for the <select>. */
  style?: React.CSSProperties;
  className?: string;
}

const LOCALES: Locale[] = ["ko", "en"];

export function LanguageSelector({ variant = "compact", style, className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <select
      aria-label={t("portal.util.language")}
      className={className}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        background: "transparent",
        border: "1px solid transparent",
        color: "inherit",
        fontFamily: "inherit",
        fontSize: "inherit",
        cursor: "pointer",
        padding: variant === "compact" ? "0 0.25rem" : "0.5rem 0.75rem",
        borderRadius: variant === "compact" ? "4px" : "8px",
        ...style,
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {variant === "compact"
            ? `${localeFlags[l]} ${l.toUpperCase()}`
            : `${localeFlags[l]} ${localeLabels[l]}`}
        </option>
      ))}
    </select>
  );
}
