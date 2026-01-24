import { useState, FormEvent, useEffect } from "react";

interface LoginProps {
  onLogin: () => void;
}

const AUTH_STORAGE_KEY = "church_erp_auth";

interface AuthData {
  userId: string;
  password: string;
  autoLogin: boolean;
}

function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 인증 정보 확인 및 자동 로그인
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      try {
        const authData: AuthData = JSON.parse(savedAuth);
        if (authData.autoLogin && authData.userId && authData.password) {
          // 자동 로그인 실행
          setTimeout(() => {
            onLogin();
          }, 500);
          return;
        }
        // 저장된 아이디/비밀번호 불러오기
        setUserId(authData.userId || "");
        setPassword(authData.password || "");
        setAutoLogin(authData.autoLogin || false);
      } catch {
        // 파싱 에러 시 무시
      }
    }
    setIsLoading(false);
  }, [onLogin]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (userId && password) {
      // 로그인 정보 로컬 스토리지에 저장
      const authData: AuthData = {
        userId,
        password,
        autoLogin,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      onLogin();
    }
  };

  // 자동 로그인 체크 중일 때 로딩 표시
  if (isLoading) {
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
              <div className="login-card__content" style={{ textAlign: "center", padding: "3rem" }}>
                <div className="login-icon" style={{ margin: "0 auto 1rem" }}>
                  <span className="material-symbols-outlined">church</span>
                </div>
                <p style={{ color: "var(--text-secondary)" }}>로그인 확인 중...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-background">
        <div className="login-background__image" />
        <div className="login-background__overlay" />
        <div className="login-background__blur" />
      </div>

      {/* Main Content */}
      <main className="login-main">
        <div className="login-container animate-slideUp">
          {/* Login Card */}
          <div className="login-card">
            <div className="login-card__accent" />

            <div className="login-card__content">
              {/* Header */}
              <div className="login-header">
                <div className="login-icon">
                  <span className="material-symbols-outlined">church</span>
                </div>
                <div>
                  <h1 className="login-header__title">Church ERP</h1>
                  <p className="login-header__subtitle">관리자 로그인</p>
                </div>
                <p className="login-header__description">
                  종합 교적 관리 시스템에 오신 것을 환영합니다.
                </p>
              </div>

              {/* Form */}
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="userId">
                    아이디
                  </label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <input
                      type="text"
                      id="userId"
                      className="form-input"
                      placeholder="관리자 아이디 입력"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    비밀번호
                  </label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <input
                      type="password"
                      id="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="login-options">
                  <div className="login-options__group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={autoLogin}
                        onChange={(e) => setAutoLogin(e.target.checked)}
                      />
                      <span className="checkbox-text">자동 로그인</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="login-button">
                  <span>로그인</span>
                  <span className="material-symbols-outlined">login</span>
                </button>
              </form>

              {/* Info Text */}
              <div className="login-info" style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  처음 로그인 시 입력한 정보가 저장됩니다.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="login-footer">
              <span className="material-symbols-outlined">desktop_windows</span>
              <span>로컬 전용 시스템</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="login-copyright">
            <p>© 2024 Church ERP System. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
