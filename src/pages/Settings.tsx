
import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { logActivity } from "../utils/auditLog";
import {
  currencies,
  CurrencyCode,
  getCurrentCurrencyCode,
  setCurrencyCode,
} from "../utils/currency";
import { loadData, saveData } from "../utils/fileStorage";
import AdminManagement from "../components/settings/AdminManagement";
import { LayoutOutletContext } from "../components/Layout";
import { useLocale } from "../i18n/LocaleContext";
import { Locale, localeFlags, localeLabels } from "../i18n/locale";
import { Church } from "../types/church";
import { ChurchChangeRequest, ChurchInfoField } from "../types/changeRequest";
import { subscribeChurchRequests, markReadByAdmin } from "../utils/changeRequests";
import ChurchInfoChangeRequestModal from "../components/ChurchInfoChangeRequestModal";
import { useAuth } from "../App";

const SETTINGS_STORAGE_KEY = "church_erp_settings";

interface ChurchSettings {
  churchName: string;
  pastorName: string;
  address: string;
  phone: string;
  email: string;
  foundedYear: string;
  logo?: string;
}

interface SettingsData {
  church: ChurchSettings;
  theme: "light" | "dark" | "system";
  language: "ko" | "en";
  currency: CurrencyCode;
}

interface Account {
  id: string;
  code: string;
  name: string;
  subName: string;
  type: "asset" | "income" | "expense";
  description?: string;
}

interface FinanceData {
  accounts: Account[];
  transactions: any[];
  budgets: any[];
}

const defaultSettings: SettingsData = {
  church: {
    churchName: "",
    pastorName: "",
    address: "",
    phone: "",
    email: "",
    foundedYear: "",
    logo: "", // Base64 encoded image
  },
  theme: "light",
  language: "ko",
  currency: "KRW" as CurrencyCode,
};

function Settings() {
  const { t, locale, setLocale } = useLocale();
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [activeTab, setActiveTab] = useState<"church" | "system" | "about" | "accounts" | "admin">("church");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // 담임목사 선택 드롭다운 제거됨 — 교회 등록 시점의 pastorName 을 사용 (수정은 요청 플로우로)

  // Current user from Layout context
  const { currentUser } = useOutletContext<LayoutOutletContext>();

  // ── 교회 기본 정보: Firestore churches/{id} 에서 로드되며 관리자가 직접 수정할 수 없음 ──
  const { auth: authState } = useAuth();
  const churchId = authState.type === "church" ? authState.admin.churchId : null;
  const [church, setChurch] = useState<Church | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChurchChangeRequest[]>([]);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestSuccess, setChangeRequestSuccess] = useState(false);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(doc(db, "churches", churchId), (snap) => {
      if (snap.exists()) setChurch({ id: snap.id, ...snap.data() } as Church);
    });
    return unsub;
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = subscribeChurchRequests(churchId, setChangeRequests);
    return unsub;
  }, [churchId]);

  // 새로 반영/반려된 요청을 관리자가 자동으로 확인 처리 — "읽음" 표시 용도
  useEffect(() => {
    changeRequests
      .filter((r) => r.status !== "pending" && !r.readByAdmin)
      .forEach((r) => { markReadByAdmin(r.id).catch(() => {}); });
  }, [changeRequests]);

  // Accounts State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({ type: "income" });
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  // Load Accounts when tab is active
  useEffect(() => {
    if (activeTab === "accounts") {
      const fetchAccounts = async () => {
        const data = await loadData<FinanceData>("finance", "finance.json");
        if (data && data.accounts) {
          setAccounts(data.accounts);
        }
      };
      fetchAccounts();
    }
  }, [activeTab]);

  const handleSaveAccount = async () => {
    if (!currentAccount.name || !currentAccount.type) {
      setSaveMessage(t("settings.alert.required"));
      return;
    }

    try {
      const data = await loadData<FinanceData>("finance", "finance.json") || { accounts: [], transactions: [], budgets: [] };
      let newAccounts = [...(data.accounts || [])];

      if (isEditingAccount && currentAccount.id) {
        newAccounts = newAccounts.map(acc =>
          acc.id === currentAccount.id ? { ...acc, ...currentAccount } as Account : acc
        );
      } else {
        const newId = crypto.randomUUID();
        const newAccount = {
          ...currentAccount,
          id: newId,
          code: currentAccount.code || "0000",
          subName: currentAccount.subName || ""
        } as Account;
        newAccounts.push(newAccount);
      }

      data.accounts = newAccounts;
      await saveData("finance", data, "finance.json");

      setAccounts(newAccounts);
      setShowAccountModal(false);
      setSaveMessage(t("settings.alert.accountSaved"));
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage(t("settings.alert.accountSaveError"));
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(t("settings.alert.accountDeleteConfirm"))) return;

    try {
      const data = await loadData<FinanceData>("finance", "finance.json") || { accounts: [], transactions: [], budgets: [] };
      const newAccounts = (data.accounts || []).filter(acc => acc.id !== id);

      data.accounts = newAccounts;
      await saveData("finance", data, "finance.json");

      setAccounts(newAccounts);
      setSaveMessage(t("settings.alert.accountDeleted"));
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage(t("settings.alert.accountDeleteError"));
    }
  };

  // 다음 계정 코드 자동 생성
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

    // 100단위 증가
    const maxCode = Math.max(...relevant.map(acc => parseInt(acc.code)));
    return (maxCode + 100).toString();
  };

  const openAddAccountModal = () => {
    const initialType: Account["type"] = "income";
    const nextCode = getNextAccountCode(initialType, accounts);
    setCurrentAccount({ type: initialType, code: nextCode, name: "", subName: "", description: "" });
    setIsEditingAccount(false);
    setShowAccountModal(true);
  };

  const openEditAccountModal = (account: Account) => {
    setCurrentAccount({ ...account });
    setIsEditingAccount(true);
    setShowAccountModal(true);
  };


  // 계정 타입 변경 시 코드 자동 업데이트 (추가 모드일 때만)
  useEffect(() => {
    if (!isEditingAccount && showAccountModal) {
      const nextCode = getNextAccountCode(currentAccount.type || "income", accounts);
      setCurrentAccount(prev => {
        if (prev.code === nextCode) return prev;
        return { ...prev, code: nextCode };
      });
    }
  }, [currentAccount.type, isEditingAccount, showAccountModal, accounts]);

  // 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await loadData<SettingsData>("settings");
        if (saved) {
          setSettings(prev => ({
            ...prev,
            ...saved,
            church: { ...prev.church, ...(saved.church || {}) },
          }));
        } else {
          // localStorage 폴백 (마이그레이션)
          const localSaved = localStorage.getItem(SETTINGS_STORAGE_KEY);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              setSettings(prev => ({ ...prev, ...parsed, church: { ...prev.church, ...(parsed.church || {}) } }));
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
      const currentCurrency = getCurrentCurrencyCode();
      setSettings(prev => ({ ...prev, currency: currentCurrency }));
    };
    loadSettings();
  }, []);

  // 설정 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveData("settings", settings);

      // Log activity
      await logActivity(
        "SETTINGS",
        t("settings.audit.churchInfoUpdated.title"),
        t("settings.audit.churchInfoUpdated.body")
      );

      setSaveMessage(t("settings.alert.settingsSaved"));
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage(t("settings.alert.settingsSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  // 로고 이미지 업로드 — Firebase Storage 에 저장하고 churches/{id}.logo 에 URL 기록
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !churchId) return;

    if (!file.type.startsWith("image/")) {
      setSaveMessage(t("settings.alert.logoImageOnly"));
      setTimeout(() => setSaveMessage(""), 2500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage(t("settings.alert.logoTooLarge"));
      setTimeout(() => setSaveMessage(""), 2500);
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `churches/${churchId}/logo_${Date.now()}.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, "churches", churchId), { logo: url });
      setChurch((prev) => (prev ? { ...prev, logo: url } : prev));
      await logActivity("SETTINGS", t("settings.audit.logoChanged.title"), t("settings.audit.logoChanged.body"));
      setSaveMessage(t("settings.alert.logoSaved"));
      setTimeout(() => setSaveMessage(""), 2500);
    } catch (err) {
      console.error("Failed to upload logo:", err);
      setSaveMessage(t("settings.alert.logoUploadError"));
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleLogoRemove = async () => {
    if (!churchId || !church?.logo) return;
    if (!confirm(t("settings.alert.logoRemoveConfirm"))) return;
    try {
      const prevUrl = church.logo;
      await updateDoc(doc(db, "churches", churchId), { logo: "" });
      try { await deleteObject(storageRef(storage, prevUrl)); } catch { /* ignore storage errors */ }
      setChurch((prev) => (prev ? { ...prev, logo: "" } : prev));
      await logActivity("SETTINGS", t("settings.audit.logoDeleted.title"), t("settings.audit.logoDeleted.body"));
      setSaveMessage(t("settings.alert.logoRemoved"));
      setTimeout(() => setSaveMessage(""), 2500);
    } catch (err) {
      console.error("Failed to remove logo:", err);
      setSaveMessage(t("settings.alert.logoRemoveError"));
    }
  };



  const tabs = [
    { id: "church" as const, icon: "church", label: t("settings.tab.church") },
    { id: "system" as const, icon: "tune", label: t("settings.tab.system") },
    { id: "accounts" as const, icon: "category", label: t("settings.tab.accounts") },
    { id: "admin" as const, icon: "admin_panel_settings", label: t("settings.tab.admin") },
    { id: "about" as const, icon: "info", label: t("settings.tab.about") },
  ];

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-header__title">
          <span className="material-symbols-outlined">settings</span>
          {t("settings.header.title")}
        </h1>
        <p className="settings-header__description">
          {t("settings.header.description")}
        </p>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* Sidebar Tabs */}
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="settings-main">
          {/* Save Message */}
          {saveMessage && (
            <div className="settings-message">
              <span className="material-symbols-outlined">check_circle</span>
              {saveMessage}
            </div>
          )}

          {/* Church Info Tab */}
          {activeTab === "church" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">church</span>
                {t("settings.church.title")}
              </h2>
              <p className="settings-section__description" dangerouslySetInnerHTML={{ __html: t("settings.church.description") }} />

              {/* 잠금 안내 배너 */}
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px",
                padding: "0.875rem 1rem", marginBottom: "1.25rem",
                display: "flex", gap: "0.5rem", alignItems: "flex-start",
              }}>
                <span className="material-symbols-outlined" style={{ color: "#b45309", fontSize: "1.125rem", flexShrink: 0 }}>lock</span>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#78350f", lineHeight: 1.55 }}>
                  {t("settings.church.lockBanner")}
                </p>
              </div>

              {changeRequestSuccess && (
                <div style={{
                  background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px",
                  padding: "0.875rem 1rem", marginBottom: "1.25rem",
                  display: "flex", gap: "0.5rem", alignItems: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "1.125rem" }}>check_circle</span>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#065f46" }}>
                    {t("settings.church.requestSuccess")}
                  </p>
                </div>
              )}

              <div className="settings-form">
                {/* 로고는 각종 문서/포탈용이라 등록 정보와 별개로 관리자가 직접 업로드 가능하게 유지 */}
                <div className="settings-form__group settings-form__group--full">
                  <label className="settings-form__label">{t("settings.church.logoLabel")}</label>
                  <div className="logo-upload-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="logo-preview" style={{
                      width: '80px',
                      height: '80px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-secondary)',
                      overflow: 'hidden'
                    }}>
                      {church?.logo ? (
                        <img src={church.logo} alt="Church Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--text-tertiary)' }}>church</span>
                      )}
                    </div>
                    <div className="logo-actions">
                      <label className="btn-secondary" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.375rem',
                        cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        opacity: uploadingLogo ? 0.6 : 1,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>upload</span>
                        {uploadingLogo ? t("settings.church.logoUploading") : church?.logo ? t("settings.church.logoReplace") : t("settings.church.logoPick")}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo || !churchId}
                          style={{ display: "none" }}
                        />
                      </label>
                      {church?.logo && (
                        <button
                          className="btn-danger"
                          onClick={handleLogoRemove}
                          style={{
                            marginLeft: "0.5rem",
                            padding: "0.4rem 0.8rem",
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#ef4444',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t("settings.church.logoDelete")}
                        </button>
                      )}
                      <p className="settings-form__hint" style={{ marginTop: "0.5rem", fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {t("settings.church.logoHint")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 잠긴 등록 정보 (읽기 전용) */}
                <div className="settings-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', gridColumn: 'span 2' }}>
                  <LockedField label={t("churchInfoField.name")} value={church?.name} notRegisteredLabel={t("settings.locked.notRegistered")} />
                  <LockedField label={t("churchInfoField.pastorName")} value={church?.pastorName} notRegisteredLabel={t("settings.locked.notRegistered")} />
                </div>
                <div className="settings-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', gridColumn: 'span 2' }}>
                  <LockedField label={t("churchInfoField.email")} value={church?.email} notRegisteredLabel={t("settings.locked.notRegistered")} />
                  <LockedField label={t("churchInfoField.phone")} value={church?.phone} notRegisteredLabel={t("settings.locked.notRegistered")} />
                </div>
                <div className="settings-form__group settings-form__group--full">
                  <LockedField label={t("churchInfoField.address")} value={church?.address} notRegisteredLabel={t("settings.locked.notRegistered")} fullWidth />
                </div>
              </div>

              <div className="settings-actions" style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={() => { setChangeRequestSuccess(false); setShowChangeRequestModal(true); }}
                  disabled={!church}
                >
                  <span className="material-symbols-outlined">edit_note</span>
                  {t("settings.church.requestEdit")}
                </button>
              </div>

              {/* 요청 내역 */}
              <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#64748b" }}>history</span>
                  {t("settings.church.historyTitle")}
                </h3>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#64748b" }}>
                  {t("settings.church.historyDescription")}
                </p>
                {changeRequests.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem", fontSize: "0.88rem", border: "1px dashed #e2e8f0", borderRadius: "10px" }}>
                    {t("settings.church.historyEmpty")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    {changeRequests.slice(0, 10).map((r) => <RequestRow key={r.id} r={r} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === "system" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">tune</span>
                {t("settings.system.title")}
              </h2>
              <p className="settings-section__description">
                {t("settings.system.description")}
              </p>

              <div className="settings-form">
                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.language")}</label>
                  <select
                    className="settings-form__select"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                  >
                    <option value="ko">{localeFlags.ko} {localeLabels.ko}</option>
                    <option value="en">{localeFlags.en} {localeLabels.en}</option>
                  </select>
                  <p className="settings-form__hint">
                    {t("settings.languageHint")}
                  </p>
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.system.currency")}</label>
                  <select
                    className="settings-form__select"
                    value={settings.currency}
                    onChange={(e) => {
                      const newCurrency = e.target.value as CurrencyCode;
                      setSettings((prev) => ({ ...prev, currency: newCurrency }));
                      setCurrencyCode(newCurrency);
                    }}
                  >
                    {Object.values(currencies).map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <p className="settings-form__hint">
                    {t("settings.system.currencyHint")}
                  </p>
                </div>

              </div>

              <div className="settings-actions">
                <button className="settings-btn settings-btn--primary" onClick={handleSave} disabled={isSaving}>
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? t("common.saving") : t("settings.system.save")}
                </button>
              </div>
            </div>
          )}

          {/* Admin Management Tab */}
          {activeTab === "admin" && (
            <div className="settings-section">
              <AdminManagement currentUser={currentUser} />
            </div>
          )}

          {/* Account Management Tab */}
          {activeTab === "accounts" && (
            <div className="settings-section">
              <div className="settings-section__header-row">
                <div>
                  <h2 className="settings-section__title">
                    <span className="material-symbols-outlined">category</span>
                    {t("settings.accounts.title")}
                  </h2>
                  <p className="settings-section__description">
                    {t("settings.accounts.description")}
                  </p>
                </div>
                <button className="settings-btn settings-btn--primary" onClick={openAddAccountModal}>
                  <span className="material-symbols-outlined">add</span>
                  {t("settings.accounts.add")}
                </button>
              </div>

              <div className="settings-table-container">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>{t("settings.accounts.colType")}</th>
                      <th>{t("settings.accounts.colName")}</th>
                      <th>{t("settings.accounts.colDescription")}</th>
                      <th style={{ width: "100px" }}>{t("settings.accounts.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <span className={`badge badge--${account.type} `}>
                            {account.type === "income" ? t("settings.accounts.typeIncome") : account.type === "expense" ? t("settings.accounts.typeExpense") : t("settings.accounts.typeAsset")}
                          </span>
                        </td>
                        <td>
                          <div className="account-name">
                            <span className="main">{account.name}</span>
                            {account.subName && <span className="sub">({account.subName})</span>}
                          </div>
                        </td>
                        <td className="text-secondary">{account.description || "-"}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="icon-btn" onClick={() => openEditAccountModal(account)}>
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="icon-btn" onClick={() => handleDeleteAccount(account.id)}>
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {accounts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="table-empty">{t("settings.accounts.empty")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">info</span>
                {t("settings.about.title")}
              </h2>

              <div className="settings-about">
                <div className="settings-about__logo">
                  <span className="material-symbols-outlined">church</span>
                </div>
                <h3 className="settings-about__name">Church ERP</h3>

                <div className="settings-about__info">
                  <div className="settings-about__info-item">
                    <span className="settings-about__info-label">{t("settings.about.license")}</span>
                    <span className="settings-about__info-value">MIT License</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="settings-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="settings-modal settings-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3 className="settings-modal__title">
                {isEditingAccount ? t("settings.account.editTitle") : t("settings.account.addTitle")}
              </h3>
              <button className="icon-btn" onClick={() => setShowAccountModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal__body">
              <div className="settings-form">
                {/* Type Selection */}
                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.account.typeLabel")}</label>
                  <div className="account-type-selector">
                    <label className={`type - option ${currentAccount.type === "income" ? "active income" : ""} `}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "income"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "income" }))}
                      />
                      <span>{t("settings.accounts.typeIncome")}</span>
                    </label>
                    <label className={`type - option ${currentAccount.type === "expense" ? "active expense" : ""} `}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "expense"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "expense" }))}
                      />
                      <span>{t("settings.accounts.typeExpense")}</span>
                    </label>
                    <label className={`type - option ${currentAccount.type === "asset" ? "active asset" : ""} `}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "asset"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "asset" }))}
                      />
                      <span>{t("settings.accounts.typeAsset")}</span>
                    </label>
                  </div>
                </div>


                {/* Name */}
                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.account.nameLabel")} <span className="required">*</span></label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder={t("settings.account.namePlaceholder")}
                    value={currentAccount.name || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* SubName & Description */}
                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.account.subNameLabel")}</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder={t("settings.account.subNamePlaceholder")}
                    value={currentAccount.subName || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, subName: e.target.value }))}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">{t("settings.account.descriptionLabel")}</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder={t("settings.account.descriptionPlaceholder")}
                    value={currentAccount.description || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="settings-modal__footer">
              <button className="settings-btn settings-btn--outline" onClick={() => setShowAccountModal(false)}>{t("common.cancel")}</button>
              <button className="settings-btn settings-btn--primary" onClick={handleSaveAccount}>{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* 교회 정보 수정 요청 모달 */}
      {showChangeRequestModal && church && currentUser && (
        <ChurchInfoChangeRequestModal
          church={church}
          requester={{ uid: currentUser.id, email: currentUser.email, displayName: currentUser.displayName }}
          onClose={() => setShowChangeRequestModal(false)}
          onSubmitted={() => {
            setShowChangeRequestModal(false);
            setChangeRequestSuccess(true);
            setTimeout(() => setChangeRequestSuccess(false), 6000);
          }}
        />
      )}
    </div>
  );
}

function LockedField({ label, value, fullWidth, notRegisteredLabel }: { label: string; value?: string; fullWidth?: boolean; notRegisteredLabel: string }) {
  return (
    <div className="settings-form__group" style={fullWidth ? { gridColumn: "span 2" } : undefined}>
      <div
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#64748b",
          marginBottom: "0.25rem",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "0.25rem 0",
          color: value ? "#0f172a" : "#94a3b8",
          fontSize: "0.95rem",
          fontWeight: value ? 500 : 400,
          minHeight: "1.5rem",
          lineHeight: 1.5,
          fontStyle: value ? "normal" : "italic",
        }}
      >
        {value || notRegisteredLabel}
      </div>
    </div>
  );
}

function RequestRow({ r }: { r: ChurchChangeRequest }) {
  const { t, locale } = useLocale();
  const badge = (() => {
    if (r.status === "pending") return { text: t("settings.request.statusPending"), bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
    if (r.status === "approved") return { text: t("settings.request.statusApproved"), bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
    return { text: t("settings.request.statusRejected"), bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  })();
  const when = new Date(r.createdAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
  const fieldLabel = (field: ChurchInfoField) => t(`churchInfoField.${field}` as const);
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 0.875rem", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
          }}
        >
          {badge.text}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("settings.request.requestedAt", { when })}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.82rem", color: "#334155" }}>
        {r.items.map((item, i) => (
          <div key={i}>
            <strong>{fieldLabel(item.field)}</strong>:{" "}
            <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{item.currentValue || t("settings.request.noValue")}</span>
            {" → "}
            <span style={{ color: "#16649c", fontWeight: 600 }}>{item.requestedValue}</span>
          </div>
        ))}
      </div>
      {r.reason && (
        <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.625rem", background: "#f8fafc", borderRadius: "6px", fontSize: "0.78rem", color: "#475569" }}>
          <strong>{t("settings.request.reason")}:</strong> {r.reason}
        </div>
      )}
      {r.resolverNote && (
        <div style={{ marginTop: "0.375rem", padding: "0.5rem 0.625rem", background: r.status === "approved" ? "#f0fdf4" : "#fef2f2", borderRadius: "6px", fontSize: "0.78rem", color: r.status === "approved" ? "#166534" : "#991b1b" }}>
          <strong>{t("settings.request.resolverNote")}:</strong> {r.resolverNote}
        </div>
      )}
    </div>
  );
}

export default Settings;
