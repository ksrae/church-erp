import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

interface LayoutProps {
  onLogout: () => void;
}

function Layout({ onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: "dashboard", label: "대시보드" },
    { path: "/members", icon: "groups", label: "성도 관리" },
    { path: "/finance", icon: "account_balance_wallet", label: "회계/헌금 관리" },
    { path: "/resources", icon: "folder_open", label: "사역/교육 자료" },
  ];

  const settingsItems = [
    { path: "/settings", icon: "settings", label: "시스템 설정" },
    { path: "/help", icon: "help", label: "도움말" },
  ];

  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <span className="material-symbols-outlined">church</span>
            </div>
            <div className="sidebar__logo-text">
              <h1>교회 관리 시스템</h1>
              <p>Enterprise Edition</p>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section">
            <p className="nav-section__title">설정 및 지원</p>
            {settingsItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar__user">
          <div className="sidebar__user-content">
            <div
              className="sidebar__user-avatar"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop')`,
              }}
            />
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">김은혜 목사</p>
              <p className="sidebar__user-role">관리자 권한</p>
            </div>
            <button className="sidebar__logout-btn" onClick={handleLogout} title="로그아웃">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header__left">
            <button
              className="top-header__menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="top-header__search">
              <div className="top-header__search-icon">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="text"
                className="top-header__search-input"
                placeholder="성도 이름, 전화번호, 헌금 내역 검색..."
              />
            </div>
          </div>
          <div className="top-header__right">
            <button className="top-header__notification">
              <span className="material-symbols-outlined">notifications</span>
              <span className="top-header__notification-badge" />
            </button>
            <div className="top-header__divider" />
            <span className="top-header__date">{formattedDate}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
