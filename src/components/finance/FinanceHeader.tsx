import { TabType } from "../../types/finance";
import { CurrencyCode } from "../../utils/currency";
import { useLocale } from "../../i18n/LocaleContext";

interface FinanceHeaderProps {
  activeTab: TabType;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  selectedYear: number;
  selectedMonth: number;
  showMonthSelector: boolean;
  availableMonths: string[];
  onMonthSelectorToggle: () => void;
  onMonthSelect: (year: number, month: number) => void;
  onDetailViewReset: () => void;
}

function FinanceHeader({
  activeTab,
  currencyCode,
  currencySymbol,
  selectedYear,
  selectedMonth,
  showMonthSelector,
  availableMonths,
  onMonthSelectorToggle,
  onMonthSelect,
  onDetailViewReset,
}: FinanceHeaderProps) {
  const { t, locale } = useLocale();
  const monthName = (month: number) =>
    locale === "ko"
      ? `${month}월`
      : new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });

  const getTitleByTab = () => {
    switch (activeTab) {
      case "ledger":
        return t("finance.header.ledgerTitle");
      case "income":
        return t("finance.header.incomeTitle");
      case "expense":
        return t("finance.header.expenseTitle");
      case "report":
        return t("finance.header.reportTitle");
      default:
        return "";
    }
  };

  return (
    <header className="finance-header">
      <h2 className="finance-header__title">{getTitleByTab()}</h2>
      <div className="finance-header__actions">
        <span className="finance-header__badge" style={{ marginRight: "0.5rem" }}>
          {t("finance.header.currency", { code: currencyCode, symbol: currencySymbol })}
        </span>
        <div className="month-selector">
          <button
            className="month-selector__trigger"
            onClick={onMonthSelectorToggle}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            {t("finance.header.monthSummary", { year: selectedYear, month: monthName(selectedMonth) })}
            <span className="material-symbols-outlined">
              {showMonthSelector ? "expand_less" : "expand_more"}
            </span>
          </button>
          {showMonthSelector && (
            <div className="month-selector__dropdown">
              <div className="month-selector__header">{t("finance.header.periodPrompt")}</div>
              <div className="month-selector__list">
                {availableMonths.map((monthKey) => {
                  const [year, month] = monthKey.split("-").map(Number);
                  const isSelected = year === selectedYear && month === selectedMonth;
                  return (
                    <button
                      key={monthKey}
                      className={`month-selector__item ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        onMonthSelect(year, month);
                        onDetailViewReset();
                      }}
                    >
                      <span className="material-symbols-outlined">
                        {isSelected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      {t("finance.header.monthItem", { year, month: monthName(month) })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default FinanceHeader;
