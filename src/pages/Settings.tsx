import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  currencies,
  CurrencyCode,
  getCurrentCurrencyCode,
  setCurrencyCode,
} from "../utils/currency";
import { loadData, saveData } from "../utils/fileStorage";
import AdminManagement from "../components/settings/AdminManagement";
import { LayoutOutletContext } from "../components/Layout";

const SETTINGS_STORAGE_KEY = "church_erp_settings";

interface ChurchSettings {
  churchName: string;
  pastorName: string;
  address: string;
  phone: string;
  email: string;
  foundedYear: string;
}

interface SettingsData {
  church: ChurchSettings;
  theme: "light" | "dark" | "system";
  language: "ko" | "en";
  currency: CurrencyCode;
  autoBackup: boolean;
  backupInterval: "daily" | "weekly" | "monthly";
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
  },
  theme: "light",
  language: "ko",
  currency: "KRW" as CurrencyCode,
  autoBackup: true,
  backupInterval: "weekly",
};

function Settings() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [activeTab, setActiveTab] = useState<"church" | "system" | "data" | "about" | "accounts" | "admin">("church");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Current user from Layout context
  const { currentUser } = useOutletContext<LayoutOutletContext>();

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
      setSaveMessage("필수 정보를 입력해주세요.");
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
      setSaveMessage("계정이 저장되었습니다.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("정말 이 계정을 삭제하시겠습니까? 거래 내역이 존재할 경우 문제가 발생할 수 있습니다.")) return;

    try {
      const data = await loadData<FinanceData>("finance", "finance.json") || { accounts: [], transactions: [], budgets: [] };
      const newAccounts = (data.accounts || []).filter(acc => acc.id !== id);

      data.accounts = newAccounts;
      await saveData("finance", data, "finance.json");

      setAccounts(newAccounts);
      setSaveMessage("계정이 삭제되었습니다.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("삭제 중 오류가 발생했습니다.");
    }
  };

  // 데이터 백업 (JSON 파일 다운로드) - File Storage 기반
  const handleBackup = async () => {
    try {
      const backupData: Record<string, any> = {};

      // Finance Data
      const financeData = await loadData("finance", "finance.json");
      if (financeData) backupData.finance = financeData;

      // 추가 데이터 타입이 있다면 여기서 로드
      // const membersData = await loadData("members", "members.json");
      // if (membersData) backupData.members = membersData;

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `church_erp_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSaveMessage("백업 파일이 다운로드되었습니다.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("백업 생성 중 오류가 발생했습니다.");
    }
  };

  // 데이터 복원 - File Storage 기반
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        if (data.finance) {
          await saveData("finance", data.finance, "finance.json");
        }

        // 다른 데이터 복원 로직 추가 가능

        // 계정 목록 새로고침
        if (activeTab === "accounts") {
          const loaded = await loadData<FinanceData>("finance", "finance.json");
          if (loaded?.accounts) setAccounts(loaded.accounts);
        }

        setSaveMessage("데이터가 성공적으로 복원되었습니다.");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch (e) {
        console.error(e);
        setSaveMessage("파일 형식이 올바르지 않거나 복원 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // 시스템 초기화 - File Storage 기반
  const handleReset = async () => {
    try {
      // Finance 초기화
      await saveData("finance", { accounts: [], transactions: [], budgets: [] }, "finance.json");

      // 설정 초기화
      setSettings(defaultSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));

      setAccounts([]);
      setShowResetConfirm(false);
      setSaveMessage("모든 데이터가 초기화되었습니다.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("초기화 중 오류가 발생했습니다.");
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
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // 파싱 에러 시 기본값 사용
      }
    }
    // Load current currency setting
    const currentCurrency = getCurrentCurrencyCode();
    setSettings(prev => ({ ...prev, currency: currentCurrency }));
  }, []);

  // 설정 저장
  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setSaveMessage("설정이 저장되었습니다.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("저장 중 오류가 발생했습니다.");
    }
    setIsSaving(false);
  };

  // 교회 정보 변경
  const handleChurchChange = (field: keyof ChurchSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      church: {
        ...prev.church,
        [field]: value,
      },
    }));
  };



  const tabs = [
    { id: "church" as const, icon: "church", label: "교회 정보" },
    { id: "system" as const, icon: "tune", label: "시스템 설정" },
    { id: "accounts" as const, icon: "category", label: "계정 관리" },
    { id: "admin" as const, icon: "admin_panel_settings", label: "관리자 관리" },
    { id: "data" as const, icon: "storage", label: "데이터 관리" },
    { id: "about" as const, icon: "info", label: "앱 정보" },
  ];

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-header__title">
          <span className="material-symbols-outlined">settings</span>
          시스템 설정
        </h1>
        <p className="settings-header__description">
          교회 정보, 시스템 환경 및 데이터를 관리할 수 있습니다.
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
                교회 기본 정보
              </h2>
              <p className="settings-section__description">
                교회의 기본 정보를 입력해주세요. 이 정보는 각종 문서 및 보고서에 사용됩니다.
              </p>

              <div className="settings-form">
                <div className="settings-form__group">
                  <label className="settings-form__label">교회 이름</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="예: 은혜의교회"
                    value={settings.church.churchName}
                    onChange={(e) => handleChurchChange("churchName", e.target.value)}
                  />
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">담임목사 성함</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="예: 김은혜"
                    value={settings.church.pastorName}
                    onChange={(e) => handleChurchChange("pastorName", e.target.value)}
                  />
                </div>

                <div className="settings-form__group settings-form__group--full">
                  <label className="settings-form__label">교회 주소</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="예: 서울시 강남구 역삼동 123-45"
                    value={settings.church.address}
                    onChange={(e) => handleChurchChange("address", e.target.value)}
                  />
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">연락처</label>
                  <input
                    type="tel"
                    className="settings-form__input"
                    placeholder="예: 02-1234-5678"
                    value={settings.church.phone}
                    onChange={(e) => handleChurchChange("phone", e.target.value)}
                  />
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">이메일</label>
                  <input
                    type="email"
                    className="settings-form__input"
                    placeholder="예: info@church.com"
                    value={settings.church.email}
                    onChange={(e) => handleChurchChange("email", e.target.value)}
                  />
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">설립연도</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="예: 1990"
                    value={settings.church.foundedYear}
                    onChange={(e) => handleChurchChange("foundedYear", e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button className="settings-btn settings-btn--primary" onClick={handleSave} disabled={isSaving}>
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === "system" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">tune</span>
                시스템 환경설정
              </h2>
              <p className="settings-section__description">
                앱의 기본 동작 방식을 설정합니다.
              </p>

              <div className="settings-form">
                <div className="settings-form__group">
                  <label className="settings-form__label">언어</label>
                  <select
                    className="settings-form__select"
                    value={settings.language}
                    onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value as SettingsData["language"] }))}
                  >
                    <option value="ko">한국어</option>
                  </select>
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">통화</label>
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
                    금액 표시에 사용되는 통화를 선택합니다. 변경 시 모든 금액 표시에 즉시 적용됩니다.
                  </p>
                </div>

                <div className="settings-form__group settings-form__group--full">
                  <label className="settings-form__label">자동 백업</label>
                  <div className="settings-toggle">
                    <label className="settings-toggle__switch">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        onChange={() => { }}
                      />
                      <span className="settings-toggle__slider"></span>
                    </label>
                    <span className="settings-toggle__text">
                      {settings.autoBackup ? "활성화됨 (준비중)" : "비활성화됨 (파일 관리 사용)"}
                    </span>
                  </div>
                  <p className="settings-form__hint">자동 백업 기능은 현재 지원되지 않습니다. 데이터 관리 탭에서 수동 백업을 이용해주세요.</p>
                </div>

                {settings.autoBackup && (
                  <div className="settings-form__group">
                    <label className="settings-form__label">백업 주기</label>
                    <select
                      className="settings-form__select"
                      value={settings.backupInterval}
                      onChange={(e) => setSettings((prev) => ({ ...prev, backupInterval: e.target.value as SettingsData["backupInterval"] }))}
                    >
                      <option value="daily">매일</option>
                      <option value="weekly">매주</option>
                      <option value="monthly">매월</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="settings-actions">
                <button className="settings-btn settings-btn--primary" onClick={handleSave} disabled={isSaving}>
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          )}

          {/* Admin Management Tab */}
          {activeTab === "admin" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">admin_panel_settings</span>
                관리자 관리
              </h2>
              <p className="settings-section__description">
                시스템에 로그인할 수 있는 관리자를 등록하고 권한을 설정합니다.
              </p>
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
                    계정 관리
                  </h2>
                  <p className="settings-section__description">
                    수입 및 지출 항목으로 사용할 계정을 관리합니다.
                  </p>
                </div>
                <button className="settings-btn settings-btn--primary" onClick={openAddAccountModal}>
                  <span className="material-symbols-outlined">add</span>
                  계정 추가
                </button>
              </div>

              <div className="settings-table-container">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>이름</th>
                      <th>설명</th>
                      <th style={{ width: "100px" }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <span className={`badge badge--${account.type}`}>
                            {account.type === "income" ? "수입" : account.type === "expense" ? "지출" : "자산"}
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
                        <td colSpan={4} className="text-center py-4">등록된 계정이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === "data" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">storage</span>
                데이터 관리
              </h2>
              <p className="settings-section__description">
                데이터 백업, 복원 및 초기화를 수행할 수 있습니다.
              </p>

              <div className="settings-data-cards">
                {/* Backup Card */}
                <div className="settings-data-card">
                  <div className="settings-data-card__icon settings-data-card__icon--blue">
                    <span className="material-symbols-outlined">cloud_download</span>
                  </div>
                  <div className="settings-data-card__content">
                    <h3 className="settings-data-card__title">데이터 백업</h3>
                    <p className="settings-data-card__description">
                      현재 저장된 모든 데이터를 JSON 파일로 다운로드합니다.
                    </p>
                    <button className="settings-btn settings-btn--outline" onClick={handleBackup}>
                      <span className="material-symbols-outlined">download</span>
                      백업 파일 다운로드
                    </button>
                  </div>
                </div>

                {/* Restore Card */}
                <div className="settings-data-card">
                  <div className="settings-data-card__icon settings-data-card__icon--green">
                    <span className="material-symbols-outlined">cloud_upload</span>
                  </div>
                  <div className="settings-data-card__content">
                    <h3 className="settings-data-card__title">데이터 복원</h3>
                    <p className="settings-data-card__description">
                      이전에 백업한 JSON 파일에서 데이터를 복원합니다.
                    </p>
                    <label className="settings-btn settings-btn--outline">
                      <span className="material-symbols-outlined">upload</span>
                      백업 파일 선택
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestore}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {/* Reset Card */}
                <div className="settings-data-card settings-data-card--danger">
                  <div className="settings-data-card__icon settings-data-card__icon--red">
                    <span className="material-symbols-outlined">delete_forever</span>
                  </div>
                  <div className="settings-data-card__content">
                    <h3 className="settings-data-card__title">시스템 초기화</h3>
                    <p className="settings-data-card__description">
                      모든 데이터를 삭제하고 시스템을 초기 상태로 되돌립니다.
                      <br />
                      <strong style={{ color: "var(--danger)" }}>이 작업은 되돌릴 수 없습니다!</strong>
                    </p>
                    <button
                      className="settings-btn settings-btn--danger"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      <span className="material-symbols-outlined">warning</span>
                      시스템 초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="material-symbols-outlined">info</span>
                앱 정보
              </h2>

              <div className="settings-about">
                <div className="settings-about__logo">
                  <span className="material-symbols-outlined">church</span>
                </div>
                <h3 className="settings-about__name">Church ERP</h3>
                <p className="settings-about__version">버전 0.1.0</p>
                <p className="settings-about__description">
                  교회 관리를 위한 통합 ERP 시스템입니다.
                  <br />
                  성도 관리, 회계/헌금 관리, 사역/교육 자료 관리 등
                  <br />
                  교회 운영에 필요한 모든 기능을 제공합니다.
                </p>

                <div className="settings-about__info">
                  <div className="settings-about__info-item">
                    <span className="settings-about__info-label">개발</span>
                    <span className="settings-about__info-value">Church ERP Team</span>
                  </div>
                  <div className="settings-about__info-item">
                    <span className="settings-about__info-label">라이선스</span>
                    <span className="settings-about__info-value">MIT License</span>
                  </div>
                  <div className="settings-about__info-item">
                    <span className="settings-about__info-label">빌드</span>
                    <span className="settings-about__info-value">Tauri + React + TypeScript</span>
                  </div>
                  <div className="settings-about__info-item">
                    <span className="settings-about__info-label">데이터 저장</span>
                    <span className="settings-about__info-value">파일 관리</span>
                  </div>
                </div>

                <p className="settings-about__copyright">
                  © 2024 Church ERP System. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="settings-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__icon">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="settings-modal__title">시스템 초기화</h3>
            <p className="settings-modal__description">
              정말로 모든 데이터를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 모든 성도 정보, 헌금 기록, 자료 등이 삭제됩니다.
            </p>
            <div className="settings-modal__actions">
              <button
                className="settings-btn settings-btn--outline"
                onClick={() => setShowResetConfirm(false)}
              >
                취소
              </button>
              <button className="settings-btn settings-btn--danger" onClick={handleReset}>
                <span className="material-symbols-outlined">delete_forever</span>
                초기화 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="settings-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="settings-modal settings-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3 className="settings-modal__title">
                {isEditingAccount ? "계정 수정" : "계정 추가"}
              </h3>
              <button className="icon-btn" onClick={() => setShowAccountModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal__body">
              <div className="settings-form">
                {/* Type Selection */}
                <div className="settings-form__group">
                  <label className="settings-form__label">계정 구분</label>
                  <div className="account-type-selector">
                    <label className={`type-option ${currentAccount.type === "income" ? "active income" : ""}`}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "income"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "income" }))}
                      />
                      <span>수입</span>
                    </label>
                    <label className={`type-option ${currentAccount.type === "expense" ? "active expense" : ""}`}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "expense"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "expense" }))}
                      />
                      <span>지출</span>
                    </label>
                    <label className={`type-option ${currentAccount.type === "asset" ? "active asset" : ""}`}>
                      <input
                        type="radio"
                        name="accountType"
                        checked={currentAccount.type === "asset"}
                        onChange={() => setCurrentAccount(prev => ({ ...prev, type: "asset" }))}
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
                    placeholder="예: 십일조헌금"
                    value={currentAccount.name || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* SubName & Description */}
                <div className="settings-form__group">
                  <label className="settings-form__label">보조 이름 (선택)</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="예: 1부예배"
                    value={currentAccount.subName || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, subName: e.target.value }))}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">설명 (선택)</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    placeholder="계정에 대한 설명을 입력하세요"
                    value={currentAccount.description || ""}
                    onChange={(e) => setCurrentAccount(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="settings-modal__footer">
              <button className="settings-btn settings-btn--outline" onClick={() => setShowAccountModal(false)}>취소</button>
              <button className="settings-btn settings-btn--primary" onClick={handleSaveAccount}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
