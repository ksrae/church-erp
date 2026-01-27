import { TabType } from "../../types/finance";
import { CurrencyCode } from "../../utils/currency";

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
  const getTitleByTab = () => {
    switch (activeTab) {
      case "ledger":
        return "총계정원장 및 재무 보고서";
      case "income":
        return "수입 관리";
      case "expense":
        return "지출 관리";
      case "report":
        return "재정 보고서";
      default:
        return "";
    }
  };

  return (
    <header className="finance-header">
      <h2 className="finance-header__title">{getTitleByTab()}</h2>
      <div className="finance-header__actions">
        <span className="finance-header__badge" style={{ marginRight: "0.5rem" }}>
          통화: {currencyCode} ({currencySymbol})
        </span>
        <div className="month-selector">
          <button
            className="month-selector__trigger"
            onClick={onMonthSelectorToggle}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            {selectedYear}년 {selectedMonth}월 결산
            <span className="material-symbols-outlined">
              {showMonthSelector ? "expand_less" : "expand_more"}
            </span>
          </button>
          {showMonthSelector && (
            <div className="month-selector__dropdown">
              <div className="month-selector__header">결산 기간 선택</div>
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
                      {year}년 {month}월
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
