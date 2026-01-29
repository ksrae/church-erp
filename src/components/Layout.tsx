import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { AdminUser, rolePermissions, roleLabels } from "../types/admin";
import { ActivityLog, getRecentLogs } from "../utils/auditLog";

const SETTINGS_STORAGE_KEY = "church_erp_settings";

interface LayoutProps {
  onLogout: () => void;
  currentUser?: AdminUser | null;
}

interface ChurchSettings {
  churchName: string;
  pastorName: string;
  logo?: string;
}

// Context type for Outlet
export interface LayoutOutletContext {
  currentUser: AdminUser | null;
}

function Layout({ onLogout, currentUser }: LayoutProps) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({
    churchName: "",
    pastorName: "",
  });

  // Notification States
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // 저장된 교회 설정 불러오기
  useEffect(() => {
    // ... (Church settings loading logic omitted for brevity, keeping existing)
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.church) {
          setChurchSettings({
            churchName: parsed.church.churchName || "",
            pastorName: parsed.church.pastorName || "",
            logo: parsed.church.logo || "",
          });
        }
      } catch {
        // 파싱 에러 무시
      }
    }

    // 알림 불러오기
    fetchNotifications();

    // Listen for new activity logs
    const handleNewLog = () => {
      fetchNotifications();
    };

    window.addEventListener("activity-logged", handleNewLog);

    return () => {
      window.removeEventListener("activity-logged", handleNewLog);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const logs = await getRecentLogs(5);
      setRecentLogs(logs);

      // Check unread status
      if (logs.length > 0) {
        const lastViewed = localStorage.getItem("lastViewedLogTime");
        const newestLogTime = new Date(logs[0].timestamp).getTime();

        if (!lastViewed || newestLogTime > parseInt(lastViewed)) {
          setHasUnread(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const handleNotificationToggle = () => {
    if (!isNotificationOpen) {
      // Opening notifications
      setIsNotificationOpen(true);
      setHasUnread(false);

      // Update last viewed time
      if (recentLogs.length > 0) {
        const newestLogTime = new Date(recentLogs[0].timestamp).getTime();
        localStorage.setItem("lastViewedLogTime", newestLogTime.toString());
      }
    } else {
      // Closing notifications
      setIsNotificationOpen(false);
    }
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  // ... (Permission check logic unchanged)
  // Check if user has access to a path
  const hasAccess = (path: string): boolean => {
    if (!currentUser) return true; // No user = show all (will be redirected anyway)

    const permissions = rolePermissions[currentUser.role];

    // Super admin has access to everything
    if (permissions.includes("*")) return true;

    // Check specific path
    return permissions.some(p => {
      if (p === "/") return path === "/";
      return path.startsWith(p);
    });
  };

  const allNavItems = [
    { path: "/", icon: "dashboard", label: "대시보드" },
    { path: "/members", icon: "groups", label: "성도 관리" },
    { path: "/finance", icon: "account_balance_wallet", label: "회계/헌금 관리" },
    { path: "/resources", icon: "folder_open", label: "사역/교육 자료", disabled: true },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item => hasAccess(item.path));

  const settingsItems = [
    { path: "/help", icon: "help", label: "도움말", disabled: true },
  ];

  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const handleUserClick = () => {
    navigate("/settings");
  };

  // Get display name
  const displayName = currentUser?.memberName || currentUser?.username || churchSettings.pastorName || "관리자";
  const displayRole = currentUser ? roleLabels[currentUser.role] : "설정 및 관리";

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            {churchSettings.logo ? (
              <img src={churchSettings.logo} alt="Church Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginRight: '10px' }} />
            ) : (
              <div className="sidebar__logo-icon">
                <span className="material-symbols-outlined">church</span>
              </div>
            )}
            <div className="sidebar__logo-text">
              <h1>{churchSettings.churchName || "교회 관리 시스템"}</h1>
              <p>Church ERP System</p>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            // @ts-ignore
            item.disabled ? (
              <div key={item.path} className="nav-item disabled">
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
                <span className="badge-soon">준비중</span>
              </div>
            ) : (
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
            )
          ))}

          <div className="nav-section">
            <p className="nav-section__title">지원</p>
            {settingsItems.map((item) => (
              // @ts-ignore
              item.disabled ? (
                <div key={item.path} className="nav-item disabled">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ) : (
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
              )
            ))}
          </div>
        </nav>

        <div className="sidebar__user">
          <div
            className="sidebar__user-content sidebar__user-content--clickable"
            onClick={handleUserClick}
            title="시스템 설정"
          >
            <div
              className="sidebar__user-avatar"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #0d4f7a) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              {displayName.charAt(0)}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">
                {displayName}
              </p>
              <p className="sidebar__user-role" style={{
                fontSize: "0.75rem",
                color: currentUser?.role === "super" ? "var(--primary)" : "var(--text-secondary)"
              }}>
                {displayRole}
              </p>
            </div>
            <span className="material-symbols-outlined sidebar__user-settings">settings</span>
          </div>
          <button className="sidebar__logout-btn" onClick={handleLogout} title="로그아웃">
            <span className="material-symbols-outlined">logout</span>
          </button>
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
          </div>
          <div className="top-header__right">
            <div className="notification-container" ref={notificationRef} style={{ position: 'relative' }}>
              <button
                className="top-header__notification"
                onClick={handleNotificationToggle}
                style={{ background: isNotificationOpen ? '#f1f5f9' : 'transparent' }}
              >
                <span className="material-symbols-outlined">notifications</span>
                {hasUnread && <span className="top-header__notification-badge" />}
              </button>

              {isNotificationOpen && (
                <div className="notification-dropdown" style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '320px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>알림</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>최근 5개</span>
                  </div>

                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {recentLogs.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        새로운 알림이 없습니다.
                      </div>
                    ) : (
                      recentLogs.map(log => (
                        <div key={log.id} style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'flex-start',
                          transition: 'background 0.2s'
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            marginTop: '0.4rem',
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.1rem' }}>{log.action}</p>
                            <p
                              title={log.details}
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '0.25rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {log.details}
                            </p>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} • {log.user || 'System'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate('/notifications');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: 'none',
                      borderTop: '1px solid var(--border-color)',
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    전체 알림 보기
                  </button>
                </div>
              )}
            </div>
            <div className="top-header__divider" />
            <span className="top-header__date">{formattedDate}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet context={{ currentUser: currentUser || null } satisfies LayoutOutletContext} />
        </div>
      </main>
    </div>
  );
}

export default Layout;
