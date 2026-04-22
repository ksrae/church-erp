import { useState, useEffect } from "react";
import { Account } from "../../types/finance";
import { useLocale } from "../../i18n/LocaleContext";

interface AccountFormProps {
  account: Account | null;
  accounts: Account[];
  onSave: (account: Account) => void;
  onCancel: () => void;
}

function AccountForm({ account, accounts, onSave, onCancel }: AccountFormProps) {
  const { t } = useLocale();
  const [formData, setFormData] = useState<Account>({
    id: account?.id || "",
    code: account?.code || "",
    name: account?.name || "",
    subName: account?.subName || "",
    type: account?.type || "income",
    description: account?.description || "",
  });

  const getNextAccountCode = (type: Account["type"], currentAccounts: Account[]) => {
    let rangeStart = 1000;
    if (type === "income") rangeStart = 4000;
    if (type === "expense") rangeStart = 5000;
    const rangeEnd = rangeStart + 999;

    const relevant = currentAccounts.filter(acc => {
      const code = parseInt(acc.code);
      return !isNaN(code) && code >= rangeStart && code <= rangeEnd;
    });

    if (relevant.length === 0) return rangeStart.toString();

    const maxCode = Math.max(...relevant.map(acc => parseInt(acc.code)));
    return (maxCode + 100).toString();
  };

  useEffect(() => {
    if (!account?.id) {
      const nextCode = getNextAccountCode(formData.type, accounts);
      setFormData(prev => {
        if (prev.code === nextCode) return prev;
        return { ...prev, code: nextCode };
      });
    }
  }, [formData.type, account?.id, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.code || !formData.name) {
      alert(t("finance.accountForm.required"));
      return;
    }
    onSave(formData);
  };

  const isEditing = !!account?.id;

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      {/* Type Selection */}
      <div className="settings-form__group">
        <label className="settings-form__label">{t("finance.accountForm.typeLabel")}</label>
        <div className="account-type-selector">
          <label className={`type-option ${formData.type === "income" ? "active income" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "income"}
              onChange={() => setFormData(prev => ({ ...prev, type: "income" }))}
            />
            <span>{t("finance.accountForm.typeIncome")}</span>
          </label>
          <label className={`type-option ${formData.type === "expense" ? "active expense" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "expense"}
              onChange={() => setFormData(prev => ({ ...prev, type: "expense" }))}
            />
            <span>{t("finance.accountForm.typeExpense")}</span>
          </label>
          <label className={`type-option ${formData.type === "asset" ? "active asset" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "asset"}
              onChange={() => setFormData(prev => ({ ...prev, type: "asset" }))}
            />
            <span>{t("finance.accountForm.typeAsset")}</span>
          </label>
        </div>
      </div>

      {/* Name */}
      <div className="settings-form__group">
        <label className="settings-form__label">{t("finance.accountForm.name")} <span className="required">*</span></label>
        <input
          type="text"
          className="settings-form__input"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t("finance.accountForm.namePlaceholder")}
          required
        />
      </div>

      {/* Sub Name */}
      <div className="settings-form__group">
        <label className="settings-form__label">{t("finance.accountForm.subName")}</label>
        <input
          type="text"
          className="settings-form__input"
          value={formData.subName}
          onChange={(e) => setFormData(prev => ({ ...prev, subName: e.target.value }))}
          placeholder={t("finance.accountForm.subNamePlaceholder")}
        />
      </div>

      {/* Description */}
      <div className="settings-form__group">
        <label className="settings-form__label">{t("finance.accountForm.description")}</label>
        <textarea
          className="settings-form__input"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t("finance.accountForm.descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <div className="settings-modal__footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className={`btn-primary ${formData.type}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? t("finance.accountForm.edit") : t("finance.accountForm.add")}
        </button>
      </div>
    </form>
  );
}

export default AccountForm;
