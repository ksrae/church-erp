import { useState } from "react";
import { signInWithGoogle, LoginResult } from "../../utils/adminSecurity";
import { useLocale } from "../../i18n/LocaleContext";

interface AdminLoginProps {
  onLogin: (result: LoginResult) => void;
  initialError?: string;
}

function AdminLogin({ onLogin, initialError }: AdminLoginProps) {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError || "");

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.type === "denied") {
        setError(result.reason);
        return;
      }
      onLogin(result);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") return;
      setError(t("adminLogin.err.generic"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "1rem" }}>
        {/* 포탈로 돌아가기 */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_back</span>
          {t("adminLogin.back")}
        </a>

        <div style={{ background: "white", borderRadius: "1.5rem", padding: "2.5rem 2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", background: "linear-gradient(135deg, #16649c 0%, #0d4f7a 100%)", borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <span className="material-symbols-outlined" style={{ color: "white", fontSize: "1.75rem" }}>church</span>
            </div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.375rem" }}>{t("adminLogin.title")}</h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>{t("adminLogin.subtitle")}</p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#ef4444", flexShrink: 0 }}>error</span>
              <p style={{ fontSize: "0.875rem", color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              padding: "0.875rem 1rem", borderRadius: "10px", border: "1.5px solid #e2e8f0",
              background: isLoading ? "#f8fafc" : "white", cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "1rem", fontWeight: 600, color: "#1e293b", transition: "all 0.15s",
            }}
          >
            {isLoading ? (
              <>
                <span style={{ width: "20px", height: "20px", border: "2px solid #cbd5e1", borderTopColor: "#16649c", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                {t("adminLogin.loggingIn")}
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.4 39.4 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C41.2 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
                </svg>
                {t("adminLogin.google")}
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", marginTop: "1.25rem", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {t("adminLogin.help")}
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AdminLogin;
