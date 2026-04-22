import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../App";
import {
  SuperDelegate,
  subscribeSuperDelegates,
  addSuperDelegate,
  removeSuperDelegate,
} from "../../utils/superAdmins";

function SuperAdminsPage() {
  const { auth } = useAuth();
  const user = auth.type === "super" ? auth : null;
  const isPrimary = user?.isPrimary === true;

  const [delegates, setDelegates] = useState<SuperDelegate[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isPrimary) return;
    const unsub = subscribeSuperDelegates(setDelegates);
    return unsub;
  }, [isPrimary]);

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isPrimary) return <Navigate to="/admin/super/dashboard" replace />;

  const handleAdd = async () => {
    setError("");
    setMsg("");
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setError("이메일을 입력해주세요."); return; }
    if (!/^\S+@\S+\.\S+$/.test(normalized)) { setError("유효한 이메일을 입력해주세요."); return; }
    if (normalized === user.email.toLowerCase()) { setError("주 슈퍼유저 이메일은 대리로 등록할 수 없습니다."); return; }
    if (delegates.some((d) => d.email.toLowerCase() === normalized)) { setError("이미 등록된 대리입니다."); return; }

    setWorking(true);
    try {
      await addSuperDelegate(normalized, user.email, displayName.trim());
      setEmail("");
      setDisplayName("");
      setMsg(`${normalized} 을(를) 슈퍼유저 대리로 추가했습니다.`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "추가 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  };

  const handleRemove = async (d: SuperDelegate) => {
    if (!confirm(`${d.email} 의 슈퍼유저 대리 권한을 해제하시겠습니까?`)) return;
    setWorking(true);
    setError("");
    setMsg("");
    try {
      await removeSuperDelegate(d.email);
      setMsg(`${d.email} 의 권한을 해제했습니다.`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "해제 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="material-symbols-outlined">shield_person</span>
          슈퍼유저 권한 관리
        </h1>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.88rem", color: "#64748b" }}>
          주 슈퍼유저 외에 백오피스 작업을 대신 수행할 <strong>슈퍼유저 대리</strong>를 지정할 수 있습니다.
          대리는 주 슈퍼유저의 모든 권한(교회 관리 · 요청 처리 등)을 갖지만, 다른 대리를 추가/삭제할 수는 없습니다.
        </p>
      </div>

      {/* 주 슈퍼유저 카드 */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.125rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ color: "white" }}>admin_panel_settings</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>PRIMARY SUPER USER</p>
          <p style={{ margin: "2px 0 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.displayName} <span style={{ color: "#64748b", fontWeight: 500 }}>· {user.email}</span>
          </p>
        </div>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
          주 슈퍼유저
        </span>
      </div>

      {/* 대리 추가 */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>슈퍼유저 대리 추가</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto", gap: "0.5rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
              Google 계정 이메일 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="delegate@example.com"
              style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>
              표시 이름 (선택)
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 김대리"
              style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={working}
            style={{ padding: "0.55rem 1rem", border: "none", background: "#16649c", color: "white", borderRadius: "8px", cursor: working ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.375rem", whiteSpace: "nowrap" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>person_add</span>
            추가
          </button>
        </div>
        {error && (
          <div style={{ marginTop: "0.75rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "#dc2626", fontSize: "0.82rem" }}>
            {error}
          </div>
        )}
        {msg && (
          <div style={{ marginTop: "0.75rem", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "#065f46", fontSize: "0.82rem" }}>
            {msg}
          </div>
        )}
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>
          · 해당 이메일로 Google 계정 로그인 시 즉시 슈퍼유저 권한이 부여됩니다.<br />
          · 대리 권한을 해제해도 해당 계정의 Google 로그인은 유지되며, 권한만 제거됩니다.
        </p>
      </div>

      {/* 대리 목록 */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
            슈퍼유저 대리 <span style={{ color: "#64748b", fontWeight: 600, marginLeft: "0.375rem" }}>({delegates.length})</span>
          </h3>
        </div>
        {delegates.length === 0 ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            등록된 슈퍼유저 대리가 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={th}>이메일</th>
                <th style={th}>표시 이름</th>
                <th style={th}>등록일</th>
                <th style={th}>등록자</th>
                <th style={{ ...th, textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {delegates
                .slice()
                .sort((a, b) => (a.email || "").localeCompare(b.email || ""))
                .map((d) => (
                  <tr key={d.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#94a3b8" }}>account_circle</span>
                        <strong style={{ color: "#0f172a" }}>{d.email}</strong>
                      </div>
                    </td>
                    <td style={td}>{d.displayName || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                    <td style={td}>{new Date(d.addedAt).toLocaleDateString("ko-KR")}</td>
                    <td style={td}>{d.addedBy}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => handleRemove(d)}
                        disabled={working}
                        style={{ padding: "0.35rem 0.7rem", border: "1px solid #fecaca", background: "white", color: "#dc2626", borderRadius: "6px", cursor: working ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                      >
                        권한 해제
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.7rem 0.875rem", textAlign: "left", fontSize: "0.74rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" };
const td: React.CSSProperties = { padding: "0.75rem 0.875rem", color: "#334155" };

export default SuperAdminsPage;
