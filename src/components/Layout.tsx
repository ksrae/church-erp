import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { rolePermissions, AdminRole } from "../types/admin";
import { AdminUser } from "../utils/adminSecurity";
import { ActivityLog, getRecentLogs } from "../utils/auditLog";
import { firebaseSignOut } from "../utils/adminSecurity";
import { loadData } from "../utils/fileStorage";
import { useLocale } from "../i18n/LocaleContext";

interface LayoutProps {
  onLogout: () => void;
  currentUser?: AdminUser | null;
}

interface ChurchSettings {
  churchName: string;
  pastorName: string;
  logo?: string;
}

export interface LayoutOutletContext {
  currentUser: AdminUser | null;
}

function Layout({ onLogout, currentUser }: LayoutProps) {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>({ churchName: "", pastorName: "" });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData<any>("settings").then((data) => {
      if (data?.church) {
        setChurchSettings({
          churchName: data.church.churchName || "",
          pastorName: data.church.pastorName || "",
          logo: data.church.logo || "",
        });
      }
    });
    fetchNotifications();

    const handleNewLog = () => fetchNotifications();
    window.addEventListener("activity-logged", handleNewLog);
    return () => window.removeEventListener("activity-logged", handleNewLog);
  }, []);

  const fetchNotifications = async () => {
    try {
      const logs = await getRecentLogs(5);
      setRecentLogs(logs);
      if (logs.length > 0) {
        const lastViewed = localStorage.getItem("lastViewedLogTime");
        const newestLogTime = new Date(logs[0].timestamp).getTime();
        if (!lastViewed || newestLogTime > parseInt(lastViewed)) setHasUnread(true);
      }
    } catch { /* ignore */ }
  };

  const handleNotificationToggle = () => {
    if (!isNotificationOpen) {
      setIsNotificationOpen(true);
      setHasUnread(false);
      if (recentLogs.length > 0) {
        localStorage.setItem("lastViewedLogTime", new Date(recentLogs[0].timestamp).getTime().toString());
      }
    } else {
      setIsNotificationOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await firebaseSignOut();
    onLogout();
    navigate("/login");
  };

  const hasAccess = (path: string): boolean => {
    if (!currentUser) return true;
    const permissions = rolePermissions[currentUser.role];
    if (permissions.includes("*")) return true;
    return permissions.some((p) => {
      if (p === "/") return path === "/";
      return path.startsWith(p);
    });
  };

  const roleLabel = (role: AdminRole): string => t(`role.${role}` as any);
  const dateLocale = locale === "ko" ? "ko-KR" : "en-US";

  const mainNavItems = [
    { path: "/", icon: "dashboard", label: t("layout.nav.dashboard") },
    { path: "/members", icon: "groups", label: t("layout.nav.members") },
    { path: "/finance", icon: "account_balance_wallet", label: t("layout.nav.finance") },
    { path: "/worship", icon: "church", label: t("layout.nav.worship") },
    { path: "/announcements", icon: "campaign", label: t("layout.nav.announcements") },
    { path: "/resources", icon: "folder_open", label: t("layout.nav.resources"), disabled: true, badge: "v0.4" },
  ];

  const supportItems = [
    { path: "/notifications", icon: "notifications", label: t("layout.nav.notifications") },
    { path: "/settings", icon: "settings", label: t("layout.nav.settings") },
  ];

  const navItems = mainNavItems.filter((item) => hasAccess(item.path));

  const today = new Date();
  const formattedDate = today.toLocaleDateString(dateLocale, {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  const displayName = currentUser?.memberName || currentUser?.username || t("layout.defaultAdmin");
  const displayRole = currentUser ? roleLabel(currentUser.role) : t("layout.defaultAdmin");

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            {churchSettings.logo ? (
              <img src={churchSettings.logo} alt="Church Logo" style={{ width: "40px", height: "40px", objectFit: "contain", marginRight: "10px" }} />
            ) : (
              <div className="sidebar__logo-icon">
                <span className="material-symbols-outlined">church</span>
              </div>
            )}
            <div className="sidebar__logo-text">
              <h1>{churchSettings.churchName || t("layout.portalName")}</h1>
              <p>Church Portal v0.3</p>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) =>
            // @ts-ignore
            item.disabled ? (
              <div key={item.path} className="nav-item disabled">
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
                {/* @ts-ignore */}
                {item.badge && <span className="badge-soon">{item.badge}</span>}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}

          <div className="nav-section">
            <p className="nav-section__title">{t("layout.nav.support")}</p>
            {supportItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <a
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
              style={{ textDecoration: "none" }}
            >
              <span className="material-symbols-outlined">open_in_new</span>
              <span>{t("layout.nav.viewPortal")}</span>
            </a>
          </div>
        </nav>

        <div className="sidebar__user">
          <div
            className="sidebar__user-content sidebar__user-content--clickable"
            onClick={() => navigate("/settings")}
            title={t("layout.systemSettings")}
          >
            <div className="sidebar__user-avatar" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #0d4f7a) 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "1rem" }}>
              {displayName.charAt(0)}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{displayName}</p>
              <p className="sidebar__user-role" style={{ fontSize: "0.75rem", color: currentUser?.role === "super" ? "var(--primary)" : "var(--text-secondary)" }}>
                {displayRole}
              </p>
            </div>
            <span className="material-symbols-outlined sidebar__user-settings">settings</span>
          </div>
          <button className="sidebar__logout-btn" onClick={handleLogout} title={t("layout.logout")}>
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="top-header__left">
            <button className="top-header__menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="top-header__right">
            <div className="notification-container" ref={notificationRef} style={{ position: "relative" }}>
              <button
                className="top-header__notification"
                onClick={handleNotificationToggle}
                style={{ background: isNotificationOpen ? "#f1f5f9" : "transparent" }}
              >
                <span className="material-symbols-outlined">notifications</span>
                {hasUnread && <span className="top-header__notification-badge" />}
              </button>
              {isNotificationOpen && (
                <div className="notification-dropdown" style={{ position: "absolute", top: "120%", right: 0, width: "320px", background: "white", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid var(--border-color)", zIndex: 1000, overflow: "hidden" }}>
                  <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: "bold" }}>{t("layout.notifHeader")}</h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{t("layout.notifRecent")}</span>
                  </div>
                  <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                    {recentLogs.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        {t("layout.notifEmpty")}
                      </div>
                    ) : (
                      recentLogs.map((log) => (
                        <div key={log.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", marginTop: "0.4rem", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.1rem" }}>{log.action}</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {log.details}
                            </p>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                              {new Date(log.timestamp).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })} • {log.user || "System"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => { setIsNotificationOpen(false); navigate("/notifications"); }}
                    style={{ width: "100%", padding: "0.75rem", background: "#f8fafc", border: "none", borderTop: "1px solid var(--border-color)", color: "var(--primary)", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    {t("layout.notifViewAll")}
                  </button>
                </div>
              )}
            </div>
            <div className="top-header__divider" />
            <span className="top-header__date">{formattedDate}</span>
          </div>
        </header>
        <div className="page-content">
          <Outlet context={{ currentUser: currentUser || null } satisfies LayoutOutletContext} />
        </div>
      </main>
    </div>
  );
}

export default Layout;
