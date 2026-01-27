import { useState, useEffect } from "react";
import { Account } from "../../types/finance";

interface AccountFormProps {
  account: Account | null;
  accounts: Account[];
  onSave: (account: Account) => void;
  onCancel: () => void;
}

function AccountForm({ account, accounts, onSave, onCancel }: AccountFormProps) {
  const [formData, setFormData] = useState<Account>({
    id: account?.id || "",
    code: account?.code || "",
    name: account?.name || "",
    subName: account?.subName || "",
    type: account?.type || "income",
    description: account?.description || "",
  });

  // Calculate next account code based on type
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

  // Auto-update code when type changes for new accounts
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
    e.stopPropagation(); // Stop propagation to prevent double-click issues with modal

    if (!formData.code || !formData.name) {
      alert("계정코드와 계정명은 필수입니다.");
      return;
    }
    onSave(formData);
  };

  const isEditing = !!account?.id;

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      {/* Type Selection */}
      <div className="settings-form__group">
        <label className="settings-form__label">계정 구분</label>
        <div className="account-type-selector">
          <label className={`type-option ${formData.type === "income" ? "active income" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "income"}
              onChange={() => setFormData(prev => ({ ...prev, type: "income" }))}
            />
            <span>수입</span>
          </label>
          <label className={`type-option ${formData.type === "expense" ? "active expense" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "expense"}
              onChange={() => setFormData(prev => ({ ...prev, type: "expense" }))}
            />
            <span>지출</span>
          </label>
          <label className={`type-option ${formData.type === "asset" ? "active asset" : ""}`}>
            <input
              type="radio"
              name="accountType"
              checked={formData.type === "asset"}
              onChange={() => setFormData(prev => ({ ...prev, type: "asset" }))}
            />
            <span>자산</span>
          </label>
        </div>
      </div>

      {/* Name */}
      <div className="settings-form__group">
        <label className="settings-form__label">계정 이름 <span className="required">*</span></label>
        <input
          type="text"
          className="settings-form__input"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="예: 십일조"
          required
        />
      </div>

      {/* Sub Name */}
      <div className="settings-form__group">
        <label className="settings-form__label">영문명</label>
        <input
          type="text"
          className="settings-form__input"
          value={formData.subName}
          onChange={(e) => setFormData(prev => ({ ...prev, subName: e.target.value }))}
          placeholder="예: Tithe"
        />
      </div>

      {/* Description */}
      <div className="settings-form__group">
        <label className="settings-form__label">설명</label>
        <textarea
          className="settings-form__input"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="계정에 대한 설명을 입력하세요"
          rows={3}
        />
      </div>

      <div className="settings-modal__footer">
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
          {isEditing ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}

export default AccountForm;
