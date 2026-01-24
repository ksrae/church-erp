import { useState, useEffect } from "react";

const SETTINGS_STORAGE_KEY = "church_erp_settings";
const DATA_STORAGE_PREFIX = "church_erp_";

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
  autoBackup: boolean;
  backupInterval: "daily" | "weekly" | "monthly";
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
  autoBackup: true,
  backupInterval: "weekly",
};

function Settings() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [activeTab, setActiveTab] = useState<"church" | "system" | "data" | "about">("church");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  // 데이터 백업 (JSON 파일 다운로드)
  const handleBackup = () => {
    const allData: Record<string, unknown> = {};

    // localStorage에서 church_erp_ 로 시작하는 모든 데이터 수집
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_STORAGE_PREFIX)) {
        try {
          allData[key] = JSON.parse(localStorage.getItem(key) || "");
        } catch {
          allData[key] = localStorage.getItem(key);
        }
      }
    }

    const dataStr = JSON.stringify(allData, null, 2);
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
  };

  // 데이터 복원
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        // 모든 데이터 복원
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        });

        // 설정 다시 불러오기
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }

        setSaveMessage("데이터가 성공적으로 복원되었습니다.");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch {
        setSaveMessage("파일 형식이 올바르지 않습니다.");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    };
    reader.readAsText(file);

    // 파일 입력 초기화
    event.target.value = "";
  };

  // 시스템 초기화
  const handleReset = () => {
    // church_erp_ 로 시작하는 모든 데이터 삭제
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // 설정 초기화
    setSettings(defaultSettings);
    setShowResetConfirm(false);
    setSaveMessage("모든 데이터가 초기화되었습니다.");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const tabs = [
    { id: "church" as const, icon: "church", label: "교회 정보" },
    { id: "system" as const, icon: "tune", label: "시스템 설정" },
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
                  <label className="settings-form__label">테마</label>
                  <select
                    className="settings-form__select"
                    value={settings.theme}
                    onChange={(e) => setSettings((prev) => ({ ...prev, theme: e.target.value as SettingsData["theme"] }))}
                  >
                    <option value="light">라이트 모드</option>
                    <option value="dark">다크 모드</option>
                    <option value="system">시스템 설정에 따름</option>
                  </select>
                </div>

                <div className="settings-form__group">
                  <label className="settings-form__label">언어</label>
                  <select
                    className="settings-form__select"
                    value={settings.language}
                    onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value as SettingsData["language"] }))}
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="settings-form__group settings-form__group--full">
                  <label className="settings-form__label">자동 백업</label>
                  <div className="settings-toggle">
                    <label className="settings-toggle__switch">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={(e) => setSettings((prev) => ({ ...prev, autoBackup: e.target.checked }))}
                      />
                      <span className="settings-toggle__slider"></span>
                    </label>
                    <span className="settings-toggle__text">
                      {settings.autoBackup ? "활성화됨" : "비활성화됨"}
                    </span>
                  </div>
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
                    <span className="settings-about__info-value">로컬 스토리지 (서버 없음)</span>
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
    </div>
  );
}

export default Settings;
