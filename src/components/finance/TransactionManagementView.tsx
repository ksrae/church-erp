import { Transaction, Account } from "../../types/finance";
import TransactionFilters from "./TransactionFilters";
import TransactionSummary from "./TransactionSummary";
import TransactionTable from "./TransactionTable";
import { useLocale } from "../../i18n/LocaleContext";

interface TransactionManagementViewProps {
  type: "income" | "expense";
  transactions: Transaction[];
  accounts: Account[];
  dateFilter: { startDate: string; endDate: string };
  searchTerm: string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  onDateFilterChange: (filter: { startDate: string; endDate: string }) => void;
  onSearchChange: (term: string) => void;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

function TransactionManagementView({
  type,
  transactions,
  accounts,
  dateFilter,
  searchTerm,
  formatCurrency,
  formatDate,
  onDateFilterChange,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
}: TransactionManagementViewProps) {
  const { t } = useLocale();
  const total = transactions.reduce((sum, x) => sum + x.amount, 0);
  const title = type === "income" ? t("finance.txnMgmt.incomeTitle") : t("finance.txnMgmt.expenseTitle");
  const subtitle = type === "income" ? t("finance.txnMgmt.incomeSubtitle") : t("finance.txnMgmt.expenseSubtitle");
  const addLabel = type === "income" ? t("finance.txnMgmt.incomeAdd") : t("finance.txnMgmt.expenseAdd");

  return (
    <>
      <div className="transaction-header">
        <div className="transaction-header__info">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="transaction-header__actions">
          <button
            className={`btn-primary ${type === "expense" ? "expense" : ""}`}
            onClick={onAdd}
          >
            <span className="material-symbols-outlined">add</span>
            {addLabel}
          </button>
        </div>
      </div>

      <TransactionFilters
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        searchTerm={searchTerm}
        onStartDateChange={(date) => onDateFilterChange({ ...dateFilter, startDate: date })}
        onEndDateChange={(date) => onDateFilterChange({ ...dateFilter, endDate: date })}
        onSearchChange={onSearchChange}
      />

      <TransactionSummary
        type={type}
        total={total}
        count={transactions.length}
        formatCurrency={formatCurrency}
      />

      <div className="transaction-table-wrapper">
        <TransactionTable
          transactions={transactions}
          accounts={accounts}
          type={type}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </>
  );
}

export default TransactionManagementView;
