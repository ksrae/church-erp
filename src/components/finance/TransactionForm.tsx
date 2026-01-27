import { useState, useEffect } from "react";
import { Account, Transaction } from "../../types/finance";

interface TransactionFormProps {
  transaction: Transaction | null;
  accounts: Account[];
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}

function TransactionForm({ transaction, accounts, onSave, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState<Transaction>({
    id: "",
    accountId: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    type: "income",
    category: "",
    memo: "",
  });

  // Update form data when transaction prop changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        id: transaction.id || "",
        accountId: transaction.accountId || "",
        date: transaction.date || new Date().toISOString().split("T")[0],
        description: transaction.description || "",
        amount: transaction.amount || 0,
        type: transaction.type || "income",
        category: transaction.category || "",
        memo: transaction.memo || "",
      });
    }
  }, [transaction]);

  const filteredAccounts = accounts.filter((a) =>
    formData.type === "income"
      ? a.type === "income" || a.type === "asset"
      : a.type === "expense" || a.type === "asset"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.accountId || !formData.description || formData.amount <= 0) {
      alert("계정, 설명, 금액은 필수입니다.");
      return;
    }

    console.log("📝 Submitting transaction:", formData);
    onSave(formData);
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>날짜 <span className="required">*</span></label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>거래 유형</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({
              ...formData,
              type: e.target.value as "income" | "expense",
              accountId: ""
            })}
          >
            <option value="income">수입</option>
            <option value="expense">지출</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>계정 <span className="required">*</span></label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          required
        >
          <option value="">계정을 선택하세요</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>설명 <span className="required">*</span></label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="거래 내용을 입력하세요"
          required
        />
      </div>
      <div className="form-group">
        <label>금액 <span className="required">*</span></label>
        <input
          type="number"
          value={formData.amount || ""}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          placeholder="0"
          min="1"
          required
        />
      </div>
      <div className="form-group">
        <label>메모</label>
        <textarea
          value={formData.memo}
          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          placeholder="추가 메모를 입력하세요"
          rows={3}
        />
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
          취소
        </button>
        <button
          type="submit"
          className={`btn-primary ${formData.type}`}
          onClick={(e) => e.stopPropagation()}
        >
          {transaction?.id ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
