import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { firebaseSignOut } from "../../utils/adminSecurity";
import { useAuth } from "../../App";
import { subscribePendingRequests } from "../../utils/changeRequests";
import { subscribePendingStatusRequests } from "../../utils/statusRequests";

function SuperLayout() {
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  const user = auth.type === "super" ? auth : null;
  const [pendingChangeCount, setPendingChangeCount] = useState(0);
  const [pendingStatusCount, setPendingStatusCount] = useState(0);

  useEffect(() => {
    const unsub1 = subscribePendingRequests((rows) => setPendingChangeCount(rows.length));
    const unsub2 = subscribePendingStatusRequests((rows) => setPendingStatusCount(rows.length));
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleLogout = async () => {
    await firebaseSignOut();
    setAuth({ type: "public" });
    navigate("/");
  };

  const navItems: { path: string; icon: string; label: string; badge: number }[] = [
    { path: "/admin/super/dashboard", icon: "dashboard", label: "대시보드", badge: 0 },
    { path: "/admin/super/churches", icon: "business", label: "교회 관리", badge: 0 },
    { path: "/admin/super/change-requests", icon: "rate_review", label: "정보 수정 요청", badge: pendingChangeCount },
    { path: "/admin/super/status-requests", icon: "contact_support", label: "상태 문의", badge: pendingStatusCount },
  ];
  if (user?.isPrimary) {
    navItems.push({ path: "/admin/super/admins", icon: "shield_person", label: "슈퍼유저 권한", badge: 0 });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 사이드바 */}
      <aside style={{ width: "220px", background: "#0f172a", color: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: "2rem", height: "2rem", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "white" }}>admin_panel_settings</span>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>시스템 관리자</p>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "white", margin: 0 }}>백오피스</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0.75rem" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin/super/dashboard"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.625rem 0.875rem", borderRadius: "8px", marginBottom: "2px",
                color: isActive ? "white" : "#94a3b8",
                background: isActive ? "#1e40af" : "transparent",
                textDecoration: "none", fontSize: "0.9rem",
                transition: "all 0.15s",
              })}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  minWidth: "1.125rem", height: "1.125rem", padding: "0 6px",
                  borderRadius: "999px", background: "#ef4444", color: "white",
                  fontSize: "0.68rem", fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "8px", marginTop: "0.75rem", color: "#94a3b8", background: "transparent", textDecoration: "none", fontSize: "0.875rem", border: "1px dashed #334155" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>open_in_new</span>
            포탈 보기
          </a>
        </nav>

        <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid #1e293b" }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: "2rem", height: "2rem", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 700 }}>
                  {user.displayName.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName}</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>
                  {user.isPrimary ? "슈퍼 관리자" : "슈퍼 관리자 대리"}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "8px", background: "transparent", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: "0.875rem" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>logout</span>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <main style={{ flex: 1, background: "#f8fafc", overflow: "auto" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "2rem 1.5rem" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default SuperLayout;
