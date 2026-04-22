import { useLocale } from "../../i18n/LocaleContext";

interface TransactionSummaryProps {
  type: "income" | "expense";
  total: number;
  count: number;
  formatCurrency: (amount: number) => string;
}

function TransactionSummary({ type, total, count, formatCurrency }: TransactionSummaryProps) {
  const { t } = useLocale();
  return (
    <div className={`transaction-summary ${type}`}>
      <div className="transaction-summary__icon">
        <span className="material-symbols-outlined">
          {type === "income" ? "trending_up" : "trending_down"}
        </span>
      </div>
      <div className="transaction-summary__info">
        <span className="label">{type === "income" ? t("finance.summary.incomePeriod") : t("finance.summary.expensePeriod")}</span>
        <span className="value">{formatCurrency(total)}</span>
      </div>
      <div className="transaction-summary__count">
        <span>{t("finance.summary.count", { n: count })}</span>
      </div>
    </div>
  );
}

export default TransactionSummary;
