interface TransactionSummaryProps {
  type: "income" | "expense";
  total: number;
  count: number;
  formatCurrency: (amount: number) => string;
}

function TransactionSummary({ type, total, count, formatCurrency }: TransactionSummaryProps) {
  return (
    <div className={`transaction-summary ${type}`}>
      <div className="transaction-summary__icon">
        <span className="material-symbols-outlined">
          {type === "income" ? "trending_up" : "trending_down"}
        </span>
      </div>
      <div className="transaction-summary__info">
        <span className="label">기간 내 총 {type === "income" ? "수입" : "지출"}</span>
        <span className="value">{formatCurrency(total)}</span>
      </div>
      <div className="transaction-summary__count">
        <span>{count}건</span>
      </div>
    </div>
  );
}

export default TransactionSummary;
