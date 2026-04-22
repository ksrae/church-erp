import { useState, useEffect } from "react";
import { Account, Transaction } from "../../types/finance";
import { MemberSelect } from "../../components/common/MemberSelect";
import { useLocale } from "../../i18n/LocaleContext";

interface Member {
  id: string;
  name: string;
  role?: string;
  profileImage?: string;
  phone?: string;
  zone?: string;
}

interface TransactionFormProps {
  transaction: Transaction | null;
  accounts: Account[];
  members: Member[];
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}

function TransactionForm({ transaction, accounts, members, onSave, onCancel }: TransactionFormProps) {
  const { t } = useLocale();
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

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    let finalDescription = formData.description;
    if (formData.type === "expense" && !finalDescription) {
      finalDescription = t("finance.txnForm.expenseDefaultDescription");
    }

    if (!formData.accountId || !finalDescription || formData.amount <= 0) {
      alert(t("finance.txnForm.required"));
      return;
    }

    const payload = { ...formData, description: finalDescription };
    console.log("📝 Submitting transaction:", payload);
    onSave(payload);
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>{t("finance.txnForm.date")} <span className="required">*</span></label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>{t("finance.txnForm.type")}</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({
              ...formData,
              type: e.target.value as "income" | "expense",
              accountId: "",
              description: ""
            })}
          >
            <option value="income">{t("finance.txnForm.typeIncome")}</option>
            <option value="expense">{t("finance.txnForm.typeExpense")}</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>{t("finance.txnForm.account")} <span className="required">*</span></label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          required
        >
          <option value="">{t("finance.txnForm.accountPlaceholder")}</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {formData.type === "income" ? (
        <div className="form-group">
          <label>{t("finance.txnForm.member")} <span className="required">*</span></label>
          <MemberSelect
            value={formData.description}
            onChange={(val: string) => setFormData({ ...formData, description: val })}
            members={members}
            includeAnonymous={true}
            placeholder={t("finance.txnForm.memberPlaceholder")}
          />
        </div>
      ) : null}

      <div className="form-group">
        <label>{t("finance.txnForm.amount")} <span className="required">*</span></label>
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
        <label>{t("finance.txnForm.memo")}</label>
        <textarea
          value={formData.memo}
          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          placeholder={formData.type === "expense" ? t("finance.txnForm.memoExpensePlaceholder") : t("finance.txnForm.memoIncomePlaceholder")}
          rows={3}
        />
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className={`btn-primary ${formData.type}`}
          onMouseDown={handleSubmit}
        >
          {transaction?.id ? t("finance.txnForm.edit") : t("finance.txnForm.add")}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;
