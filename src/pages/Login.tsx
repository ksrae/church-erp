import { useState, FormEvent } from "react";

interface LoginProps {
  onLogin: () => void;
}

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveId, setSaveId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Simple validation for demo
    if (email && password) {
      onLogin();
    }
  };

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
                  <label className="form-label" htmlFor="email">
                    아이디
                  </label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <input
                      type="email"
                      id="email"
                      className="form-input"
                      placeholder="admin@church.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    />
                  </div>
                </div>

                <div className="login-options">
                  <div className="login-options__group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={saveId}
                        onChange={(e) => setSaveId(e.target.checked)}
                      />
                      <span className="checkbox-text">아이디 저장</span>
                    </label>
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

              {/* Links */}
              <div className="login-links">
                <a href="#">비밀번호 찾기</a>
                <span className="login-links__divider" />
                <a href="#">관리자 계정 문의</a>
              </div>
            </div>

            {/* Footer */}
            <div className="login-footer">
              <span className="material-symbols-outlined">lock_clock</span>
              <span>Secure SSL Connection</span>
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
