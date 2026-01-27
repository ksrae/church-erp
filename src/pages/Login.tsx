import { useState, FormEvent, useEffect } from "react";
import { isTauriEnv } from "../utils/fileStorage";
import { loadAdminData, saveAdminData, hashPassword, verifyPassword } from "../utils/adminSecurity";
import { AdminUser, AdminData } from "../types/admin";

interface LoginProps {
  onLogin: (user: AdminUser) => void;
}

const AUTH_STORAGE_KEY = "church_erp_auth";
const DEFAULT_ADMIN_ID = "admin-super-default";

interface AuthData {
  userId: string;
  passwordHash: string;
  autoLogin: boolean;
  username?: string;
}

const sanitizeInput = (str: string) => str.replace(/[\s\uFEFF\xA0\u200b]+/g, "").trim();

function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // 초기값은 영어로 시작 (비밀번호 입력의 기본)
  const [imeState, setImeState] = useState<'EN' | 'KO'>('EN');
  const [autoLogin, setAutoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  useEffect(() => {
    const initialize = async () => {
      try {
        let adminData: AdminData | null = null;
        if (isTauriEnv()) {
          adminData = await loadAdminData<AdminData>();
        } else {
          const local = localStorage.getItem("church_erp_admins_data");
          if (local) { try { adminData = JSON.parse(local); } catch (e) { console.error(e); } }
        }

        if (!adminData || !adminData.admins || adminData.admins.length === 0) {
          const defaultPasswordHash = await hashPassword("admin");
          const defaultAdmin: AdminUser = {
            id: DEFAULT_ADMIN_ID,
            memberId: "",
            memberName: "시스템 관리자",
            username: "admin",
            passwordHash: defaultPasswordHash,
            role: "super",
            createdAt: new Date().toISOString(),
          };
          adminData = { admins: [defaultAdmin], lastUpdated: new Date().toISOString() };
          if (isTauriEnv()) await saveAdminData(adminData);
          else localStorage.setItem("church_erp_admins_data", JSON.stringify(adminData));
        }

        setAdmins(adminData.admins);

        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          try {
            const authData: AuthData = JSON.parse(savedAuth);
            if (authData.autoLogin && authData.userId && authData.passwordHash) {
              const user = adminData.admins.find(
                (a) => a.username === authData.userId && a.passwordHash === authData.passwordHash
              );
              if (user) {
                const updatedAdmins = adminData.admins.map((a) =>
                  a.id === user.id ? { ...a, lastLogin: new Date().toISOString() } : a
                );
                const newData = { admins: updatedAdmins, lastUpdated: new Date().toISOString() };
                if (isTauriEnv()) await saveAdminData(newData);
                else localStorage.setItem("church_erp_admins_data", JSON.stringify(newData));
                setTimeout(() => onLogin(user), 500);
                return;
              }
            }
            setUserId(authData.userId ? sanitizeInput(authData.userId) : "");
            setAutoLogin(authData.autoLogin || false);
          } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.error("Initialization failed:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [onLogin]);

  // IME 상태 감지 로직 (이벤트 + 데이터 분석 하이브리드)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac/Win 전환 키 통합 감지
      const isToggleKey =
        e.key === 'Hangul' || e.code === 'Lang1' ||
        e.code === 'AltRight' || e.keyCode === 21 ||
        e.code === 'CapsLock'; // Mac CapsLock 한영전환 대응

      if (isToggleKey) {
        setImeState(prev => prev === 'KO' ? 'EN' : 'KO');
        return;
      }

      // 조합 중이 아닐 때만 영문 판별 (한글 조합 중 노이즈 차단)
      if (!e.isComposing && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setImeState('EN');
      }
    };

    const handleCompositionStart = () => setImeState('KO');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('compositionstart', handleCompositionStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('compositionstart', handleCompositionStart);
    };
  }, []);

  // 입력 핸들러에서 상태 강제 동기화 (최종 방어 로직)
  const handleInputContentSync = (val: string) => {
    const lastChar = val.slice(-1);
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(lastChar)) {
      setImeState('KO');
    } else if (/[a-zA-Z0-9]/.test(lastChar)) {
      setImeState('EN');
    }
    setPassword(val);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const finalUserId = sanitizeInput(userId);
    const finalPassword = password;

    if (!finalUserId || !finalPassword) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    const user = admins.find((a) => sanitizeInput(a.username).toLowerCase() === finalUserId.toLowerCase());
    if (!user) {
      setError(`해당 아이디('${finalUserId}')를 찾을 수 없습니다.`);
      return;
    }

    let isValid = await verifyPassword(finalPassword, user.passwordHash);
    if (!isValid) isValid = await verifyPassword(finalPassword.trim(), user.passwordHash);

    if (!isValid) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    const updatedAdmins = admins.map((a) =>
      a.id === user.id ? { ...a, lastLogin: new Date().toISOString() } : a
    );
    const newData = { admins: updatedAdmins, lastUpdated: new Date().toISOString() };
    if (isTauriEnv()) await saveAdminData(newData);
    else localStorage.setItem("church_erp_admins_data", JSON.stringify(newData));

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      userId: finalUserId,
      passwordHash: user.passwordHash,
      autoLogin,
      username: user.username,
    }));
    onLogin(user);
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <main className="login-main">
          <div className="login-container">
            <div className="login-card" style={{ textAlign: "center", padding: "3rem" }}>
              <p>연결 대기 중...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-background__image" />
        <div className="login-background__overlay" />
        <div className="login-background__blur" />
      </div>

      <main className="login-main">
        <div className="login-container animate-slideUp">
          <div className="login-card">
            <div className="login-card__accent" />

            <div className="login-card__content" style={{ position: 'relative' }}>

              {/* 한/영 상태 표시기 (클릭 시 강제 전환) */}
              <div
                onClick={() => setImeState(prev => prev === 'KO' ? 'EN' : 'KO')}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  fontSize: '0.75rem', padding: '5px 14px', borderRadius: '30px',
                  background: imeState === 'KO' ? '#fff1f2' : '#f0fdf4',
                  color: imeState === 'KO' ? '#e11d48' : '#16a34a',
                  fontWeight: '900', border: `1px solid ${imeState === 'KO' ? '#fecdd3' : '#bbf7d0'}`,
                  display: 'flex', alignItems: 'center', gap: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  cursor: 'pointer', zIndex: 20, transition: 'all 0.1s ease',
                  userSelect: 'none'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>keyboard</span>
                {imeState === 'KO' ? '한글' : '영어'}
              </div>

              <div className="login-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="login-icon" style={{ margin: '0 auto 1.25rem' }}>
                  <span className="material-symbols-outlined">church</span>
                </div>
                <div>
                  <h1 className="login-header__title">Church ERP</h1>
                  <p className="login-header__subtitle">관리자 로그인</p>
                </div>
              </div>

              {error && (
                <div className="error-banner" style={{
                  background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px",
                  padding: "0.75rem 1rem", marginBottom: "1rem", color: "#ef4444",
                  display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>report</span>
                  <span>{error}</span>
                </div>
              )}

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="userId">아이디</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon"><span className="material-symbols-outlined">person</span></div>
                    <input
                      type="text" id="userId" className="form-input"
                      value={userId} onChange={(e) => setUserId(sanitizeInput(e.target.value))}
                      autoCapitalize="off" autoCorrect="off" autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">비밀번호</label>
                  <div className="form-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div className="form-input-icon"><span className="material-symbols-outlined">lock</span></div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password" className="form-input"
                      value={password} onChange={(e) => handleInputContentSync(e.target.value)}
                      autoComplete="current-password"
                      autoCapitalize="off" autoCorrect="off" spellCheck="false"
                      style={{ flex: 1, paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                        display: 'flex', alignItems: 'center', zIndex: 10
                      }}
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="login-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox" className="checkbox-input"
                      checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked)}
                    />
                    <span className="checkbox-text">자동 로그인</span>
                  </label>
                </div>

                <button type="submit" className="login-button">
                  <span>로그인</span>
                  <span className="material-symbols-outlined">login</span>
                </button>
              </form>
            </div>
            <div className="login-footer" style={{ padding: "1.25rem", textAlign: "center", background: "#f9fafb", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Church ERP System v1.0</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
