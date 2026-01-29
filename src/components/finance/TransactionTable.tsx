import { Transaction, Account } from "../../types/finance";

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
        <p>해당 기간에 {type === "income" ? "수입" : "지출"} 내역이 없습니다.</p>
        <p className="sub">
          "{type === "income" ? "수입" : "지출"} 추가" 버튼을 클릭하여 {type === "income" ? "수입" : "지출"}을 등록해주세요.
        </p>
      </div>
    );
  }

  return (
    <table className="transaction-table">
      <thead>
        <tr>
          <th>날짜</th>
          <th>계정</th>
          {type === "income" && <th>성도</th>}
          <th className="text-right">금액</th>
          <th>메모</th>
          <th className="text-center" style={{ width: "8rem" }}>작업</th>
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
                  title="수정"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  className="view-detail-btn delete"
                  onClick={() => onDelete(txn.id)}
                  title="삭제"
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
