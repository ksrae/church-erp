/**
 * Currency Utility for Church ERP
 * Handles currency formatting and settings
 */

export type CurrencyCode = "KRW" | "JPY" | "USD" | "EUR" | "GBP";

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
}

export const currencies: Record<CurrencyCode, CurrencyInfo> = {
  KRW: {
    code: "KRW",
    name: "한국 원",
    symbol: "₩",
    locale: "ko-KR",
    decimalPlaces: 0,
  },
  JPY: {
    code: "JPY",
    name: "일본 엔",
    symbol: "¥",
    locale: "ja-JP",
    decimalPlaces: 0,
  },
  USD: {
    code: "USD",
    name: "미국 달러",
    symbol: "$",
    locale: "en-US",
    decimalPlaces: 2,
  },
  EUR: {
    code: "EUR",
    name: "유로",
    symbol: "€",
    locale: "de-DE",
    decimalPlaces: 2,
  },
  GBP: {
    code: "GBP",
    name: "영국 파운드",
    symbol: "£",
    locale: "en-GB",
    decimalPlaces: 2,
  },
};

const CURRENCY_STORAGE_KEY = "church_erp_currency";

/**
 * Get the currently selected currency code from storage
 */
export function getCurrentCurrencyCode(): CurrencyCode {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (saved && saved in currencies) {
    return saved as CurrencyCode;
  }
  return "KRW"; // Default to Korean Won
}

/**
 * Set the currency code in storage
 */
export function setCurrencyCode(code: CurrencyCode): void {
  localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  // Dispatch a custom event to notify other components
  window.dispatchEvent(new CustomEvent("currencyChange", { detail: code }));
}

/**
 * Get the current currency info
 */
export function getCurrentCurrency(): CurrencyInfo {
  return currencies[getCurrentCurrencyCode()];
}

/**
 * Format a number as currency with thousands separator
 * @param amount The amount to format
 * @param includeSymbol Whether to include the currency symbol (default: true)
 */
export function formatCurrency(amount: number, includeSymbol: boolean = true): string {
  const currency = getCurrentCurrency();

  const formatted = amount.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });

  if (includeSymbol) {
    // Different placement for different currencies
    if (currency.code === "EUR") {
      return `${formatted} ${currency.symbol}`;
    }
    return `${currency.symbol} ${formatted}`;
  }

  return formatted;
}

/**
 * Format a large number with abbreviated units (e.g. 1.2M, 1억 2,000만)
 * @param amount The amount to format
 */
export function formatLargeCurrency(amount: number): string {
  const currency = getCurrentCurrency();

  if (amount === 0) return formatCurrency(0);

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  // Korean Won and Japanese Yen (East Asian numeral system - 10,000 base)
  if (currency.code === "KRW" || currency.code === "JPY") {
    // 1억 이상
    if (absAmount >= 100000000) {
      const ok = Math.floor(absAmount / 100000000);
      const man = Math.round((absAmount % 100000000) / 10000);
      const okStr = ok > 0 ? `${ok.toLocaleString(currency.locale)}억` : "";
      const manStr = man > 0 ? ` ${man.toLocaleString(currency.locale)}만` : "";
      const symbol = currency.symbol;
      return `${symbol}${sign}${okStr}${manStr}`.trim();
    }
    // 1만 이상
    if (absAmount >= 10000) {
      const man = Math.round(absAmount / 10000);
      return `${currency.symbol}${sign}${man.toLocaleString(currency.locale)}만`;
    }
    // 1만 미만은 그대로 표시
    return formatCurrency(amount);
  }

  // Western currencies (1,000 base)
  // 1 Million+
  if (absAmount >= 1000000) {
    return `${currency.symbol}${sign}${(absAmount / 1000000).toFixed(1)}M`;
  }
  // 1 Thousand+
  if (absAmount >= 1000) {
    return `${currency.symbol}${sign}${(absAmount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount);
}

/**
 * Format number with thousands separator only (no symbol)
 */
export function formatNumber(amount: number): string {
  const currency = getCurrentCurrency();
  return amount.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });
}

/**
 * Get just the currency symbol
 */
export function getCurrencySymbol(): string {
  return getCurrentCurrency().symbol;
}

/**
 * Setup a currency change listener
 * Returns a cleanup function to remove the listener
 */
export function setupCurrencyListener(callback: (code: CurrencyCode) => void): () => void {
  const handleChange = (e: Event) => {
    const customEvent = e as CustomEvent<CurrencyCode>;
    callback(customEvent.detail);
  };

  window.addEventListener("currencyChange", handleChange);

  // Return cleanup function
  return () => {
    window.removeEventListener("currencyChange", handleChange);
  };
}
