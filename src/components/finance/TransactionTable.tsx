import { Transaction, Account } from "../../types/finance";
import { useLocale } from "../../i18n/LocaleContext";

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: Account[];
  type: "income" | "expense";
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

function TransactionTable({
  transactions,
  accounts,
  type,
  formatCurrency,
  formatDate,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const { t } = useLocale();
  const getAccountName = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || "Unknown";
  };

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <span className="material-symbols-outlined">
          {type === "income" ? "trending_up" : "trending_down"}
        </span>
        <p>{type === "income" ? t("finance.table.emptyIncome") : t("finance.table.emptyExpense")}</p>
        <p className="sub">
          {type === "income" ? t("finance.table.emptyIncomeHint") : t("finance.table.emptyExpenseHint")}
        </p>
      </div>
    );
  }

  return (
    <table className="transaction-table">
      <thead>
        <tr>
          <th>{t("finance.table.date")}</th>
          <th>{t("finance.table.account")}</th>
          {type === "income" && <th>{t("finance.table.member")}</th>}
          <th className="text-right">{t("finance.table.amount")}</th>
          <th>{t("finance.table.memo")}</th>
          <th className="text-center" style={{ width: "8rem" }}>{t("finance.table.action")}</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((txn) => (
          <tr key={txn.id}>
            <td>{formatDate(txn.date)}</td>
            <td>
              <span className={`account-badge ${type}`}>
                {getAccountName(txn.accountId)}
              </span>
            </td>
            {type === "income" && <td>{txn.description}</td>}
            <td className={`text-right amount ${type}`}>
              {type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
            </td>
            <td className="memo">{txn.memo || "-"}</td>
            <td className="text-center">
              <div className="action-buttons">
                <button
                  className="view-detail-btn"
                  onClick={() => onEdit(txn)}
                  title={t("finance.table.edit")}
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  className="view-detail-btn delete"
                  onClick={() => onDelete(txn.id)}
                  title={t("finance.table.delete")}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TransactionTable;
