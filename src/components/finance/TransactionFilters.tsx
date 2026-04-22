import { useLocale } from "../../i18n/LocaleContext";

interface TransactionFiltersProps {
  startDate: string;
  endDate: string;
  searchTerm: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchChange: (term: string) => void;
}

function TransactionFilters({
  startDate,
  endDate,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
}: TransactionFiltersProps) {
  const { t } = useLocale();
  return (
    <div className="transaction-filters">
      <div className="filter-group">
        <label>{t("finance.filters.startDate")}</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div className="filter-group">
        <label>{t("finance.filters.endDate")}</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
      <div className="filter-group search">
        <label>{t("finance.filters.search")}</label>
        <input
          type="text"
          placeholder={t("finance.filters.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default TransactionFilters;
