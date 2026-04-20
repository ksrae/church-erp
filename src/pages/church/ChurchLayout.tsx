import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { firebaseSignOut } from "../../utils/adminSecurity";
import { loadData } from "../../utils/fileStorage";
import { useAuth } from "../../App";

function ChurchLayout() {
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  const admin = auth.type === "church" ? auth.admin : null;
  const [churchName, setChurchName] = useState("교회 관리");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData<any>("settings").then((s) => {
      if (s?.church?.churchName) setChurchName(s.church.churchName);
    });
  }, []);

  const handleLogout = async () => {
    await firebaseSignOut();
    setAuth({ type: "public" });
    navigate("/");
  };

  const navItems = [
    { path: "/admin/church", icon: "dashboard", label: "대시보드", end: true },
    { path: "/admin/church/members", icon: "groups", label: "성도 관리" },
    { path: "/admin/church/finance", icon: "account_balance_wallet", label: "재정/회계" },
    { path: "/admin/church/worship", icon: "church", label: "예배 관리" },
    { path: "/admin/church/announcements", icon: "campaign", label: "공지/소식" },
    { path: "/admin/church/portal", icon: "public", label: "교회 포탈 페이지" },
    { path: "/admin/church/notifications", icon: "notifications", label: "알림" },
    { path: "/admin/church/settings", icon: "settings", label: "설정" },
  ];

  const displayName = admin?.displayName || "관리자";

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <span className="material-symbols-outlined">church</span>
            </div>
            <div className="sidebar__logo-text">
              <h1>{churchName}</h1>
              <p>Church Portal v0.3</p>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section">
            <p className="nav-section__title">기타</p>
            <a href="/" target="_blank" rel="noopener noreferrer" className="nav-item" style={{ textDecoration: "none" }}>
              <span className="material-symbols-outlined">open_in_new</span>
              <span>성도 포탈 보기</span>
            </a>
          </div>
        </nav>

        <div className="sidebar__user">
          <div className="sidebar__user-content sidebar__user-content--clickable" onClick={() => navigate("/admin/church/settings")} title="설정">
            {admin?.photoURL ? (
              <img src={admin.photoURL} alt="" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div className="sidebar__user-avatar" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #0d4f7a) 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                {displayName.charAt(0)}
              </div>
            )}
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{displayName}</p>
              <p className="sidebar__user-role" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>교회 관리자</p>
            </div>
            <span className="material-symbols-outlined sidebar__user-settings">settings</span>
          </div>
          <button className="sidebar__logout-btn" onClick={handleLogout} title="로그아웃">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="top-header__left">
            <button className="top-header__menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="top-header__right">
            <div className="top-header__divider" />
            <span className="top-header__date">
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default ChurchLayout;
