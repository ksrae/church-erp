import { Outlet, NavLink, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { firebaseSignOut, AdminUser } from "../../utils/adminSecurity";
import { useAuth } from "../../App";
import { LayoutOutletContext } from "../../components/Layout";
import { Church, ChurchStatus, getChurchStatus } from "../../types/church";
import { subscribeChurchRequests } from "../../utils/changeRequests";
import ChurchStatusRequestModal from "../../components/ChurchStatusRequestModal";
import { useLocale } from "../../i18n/LocaleContext";

const DASHBOARD_PATH = "/admin/church";

function ChurchLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useAuth();
  const { t, locale } = useLocale();
  const admin = auth.type === "church" ? auth.admin : null;

  const [church, setChurch] = useState<Church | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showStatusRequestModal, setShowStatusRequestModal] = useState(false);
  const [statusRequestSent, setStatusRequestSent] = useState(false);

  useEffect(() => {
    if (!admin?.churchId) return;
    const unsub = onSnapshot(doc(db, "churches", admin.churchId), (snap) => {
      if (snap.exists()) {
        setChurch({ id: snap.id, ...snap.data() } as Church);
      } else {
        setChurch(null);
      }
    });
    return unsub;
  }, [admin?.churchId]);

  // 수정 요청 알림: 관리자가 아직 열람하지 않은(반영/반려) 결과 수 → 설정 메뉴에 뱃지로 노출
  const [unreadRequestResults, setUnreadRequestResults] = useState(0);
  useEffect(() => {
    if (!admin?.churchId) return;
    const unsub = subscribeChurchRequests(admin.churchId, (rows) => {
      setUnreadRequestResults(rows.filter((r) => r.status !== "pending" && !r.readByAdmin).length);
    });
    return unsub;
  }, [admin?.churchId]);

  const status: ChurchStatus = useMemo(
    () => (church ? getChurchStatus(church) : "active"),
    [church]
  );
  const isHeld = status === "hold";

  const handleLogout = async () => {
    await firebaseSignOut();
    setAuth({ type: "public" });
    navigate("/");
  };

  const churchName = church?.name || t("admin.nav.churchFallback");
  const churchLogo = church?.logo;

  const navItems = [
    { path: "/admin/church", icon: "dashboard", label: t("admin.nav.dashboard"), end: true },
    { path: "/admin/church/members", icon: "groups", label: t("admin.nav.members") },
    { path: "/admin/church/finance", icon: "account_balance_wallet", label: t("admin.nav.finance") },
    { path: "/admin/church/worship", icon: "church", label: t("admin.nav.worship") },
    { path: "/admin/church/announcements", icon: "campaign", label: t("admin.nav.announcements") },
    { path: "/admin/church/resources", icon: "folder_open", label: t("admin.nav.resources") },
    { path: "/admin/church/portal", icon: "public", label: t("admin.nav.portal") },
    { path: "/admin/church/notifications", icon: "notifications", label: t("admin.nav.notifications") },
    { path: "/admin/church/settings", icon: "settings", label: t("admin.nav.settings") },
  ];

  const displayName = admin?.displayName || t("admin.nav.adminFallback");

  // 하위 페이지(Members, Settings, Notifications 등) 호환용 컨텍스트
  const outletUser: AdminUser | null = admin
    ? {
        id: admin.uid,
        email: admin.email,
        displayName: admin.displayName,
        photoURL: admin.photoURL,
        memberId: admin.uid,
        memberName: admin.displayName,
        username: admin.email,
        role: "super",
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
      }
    : null;

  const formattedDate = new Date().toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // 보류(hold) 상태에서는 대시보드 외 경로 강제 차단
  if (isHeld && location.pathname !== DASHBOARD_PATH) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            {churchLogo ? (
              <img
                src={churchLogo}
                alt=""
                style={{ width: "40px", height: "40px", objectFit: "contain", marginRight: "10px", borderRadius: "8px" }}
              />
            ) : (
              <div className="sidebar__logo-icon">
                <span className="material-symbols-outlined">church</span>
              </div>
            )}
            <div className="sidebar__logo-text">
              <h1>{churchName}</h1>
              <p>Church Portal v0.3</p>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => {
            const isDashboard = item.path === DASHBOARD_PATH;
            const disabled = isHeld && !isDashboard;
            if (disabled) {
              return (
                <div
                  key={item.path}
                  className="nav-item disabled"
                  title={t("admin.nav.heldDisabledHint")}
                  style={{ opacity: 0.45, cursor: "not-allowed" }}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="material-symbols-outlined" style={{ marginLeft: "auto", fontSize: "1rem", color: "#b45309" }}>
                    lock
                  </span>
                </div>
              );
            }
            const showBadge = item.path === "/admin/church/settings" && unreadRequestResults > 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {showBadge && (
                  <span style={{
                    minWidth: "1.125rem", height: "1.125rem", padding: "0 6px",
                    borderRadius: "999px", background: "#ef4444", color: "white",
                    fontSize: "0.68rem", fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {unreadRequestResults > 99 ? "99+" : unreadRequestResults}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="nav-section">
            <p className="nav-section__title">{t("admin.nav.section.other")}</p>
            <a href="/" target="_blank" rel="noopener noreferrer" className="nav-item" style={{ textDecoration: "none" }}>
              <span className="material-symbols-outlined">open_in_new</span>
              <span>{t("admin.nav.viewPortal")}</span>
            </a>
          </div>
        </nav>

        <div className="sidebar__user">
          <div
            className="sidebar__user-content sidebar__user-content--clickable"
            onClick={() => { if (!isHeld) navigate("/admin/church/settings"); }}
            title={isHeld ? t("admin.nav.heldStateLabel") : t("admin.nav.settings")}
            style={{ cursor: isHeld ? "not-allowed" : "pointer", opacity: isHeld ? 0.6 : 1 }}
          >
            {admin?.photoURL ? (
              <img src={admin.photoURL} alt="" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div
                className="sidebar__user-avatar"
                style={{
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #0d4f7a) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {displayName.charAt(0)}
              </div>
            )}
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{displayName}</p>
              <p className="sidebar__user-role" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                {t("admin.role.churchAdmin")}
              </p>
            </div>
            <span className="material-symbols-outlined sidebar__user-settings">settings</span>
          </div>
          <button className="sidebar__logout-btn" onClick={handleLogout} title={t("common.logout")}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginLeft: "0.25rem" }}>
              {churchLogo ? (
                <img
                  src={churchLogo}
                  alt=""
                  style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{ color: "#16649c", fontSize: "1.5rem" }}
                >
                  church
                </span>
              )}
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {churchName}
              </h2>
              {isHeld && (
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px",
                  background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a",
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>pause_circle</span>
                  {t("hold.badge")}
                </span>
              )}
            </div>
          </div>
          <div className="top-header__right">
            <div className="top-header__divider" />
            <span className="top-header__date">{formattedDate}</span>
          </div>
        </header>
        <div className="page-content">
          <Outlet context={{ currentUser: outletUser } satisfies LayoutOutletContext} />
        </div>
      </main>

      {isHeld && (
        <HoldModal
          churchName={churchName}
          reason={church?.statusReason || ""}
          requestSent={statusRequestSent}
          onOpenRequestForm={() => setShowStatusRequestModal(true)}
          onLogout={handleLogout}
        />
      )}

      {showStatusRequestModal && admin && (
        <ChurchStatusRequestModal
          context="hold"
          churchId={admin.churchId}
          churchName={churchName}
          requester={{ uid: admin.uid, email: admin.email, displayName: admin.displayName }}
          onClose={() => setShowStatusRequestModal(false)}
          onSubmitted={() => { setShowStatusRequestModal(false); setStatusRequestSent(true); }}
        />
      )}
    </div>
  );
}

interface HoldModalProps {
  churchName: string;
  reason: string;
  requestSent: boolean;
  onOpenRequestForm: () => void;
  onLogout: () => void;
}

function HoldModal({ churchName, reason, requestSent, onOpenRequestForm, onLogout }: HoldModalProps) {
  const { t } = useLocale();
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="hold-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        backdropFilter: "blur(3px)",
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "2rem",
        maxWidth: "480px",
        width: "100%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        border: "1px solid #fde68a",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div style={{
            width: "3.5rem", height: "3.5rem", margin: "0 auto 0.75rem",
            borderRadius: "50%", background: "#fef3c7",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{ color: "#b45309", fontSize: "2rem" }}>pause_circle</span>
          </div>
          <h2 id="hold-title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
            {t("hold.title")}
          </h2>
        </div>

        <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.6, margin: "0 0 0.875rem" }}>
          <strong style={{ color: "#0f172a" }}>"{churchName}"</strong> {t("hold.body1Prefix")} <strong style={{ color: "#b45309" }}>{t("hold.body1Status")}</strong>{t("hold.body1Suffix")}
        </p>
        <p style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6, margin: "0 0 0.875rem", whiteSpace: "pre-line" }}>
          {t("hold.body2")}
        </p>
        {reason && (
          <div style={{
            padding: "0.75rem 0.875rem",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            marginBottom: "1rem",
          }}>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#92400e", fontWeight: 700, marginBottom: "0.25rem" }}>{t("hold.adminMemo")}</p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#78350f", lineHeight: 1.5 }}>{reason}</p>
          </div>
        )}

        {requestSent && (
          <div style={{ padding: "0.75rem 0.875rem", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "1.1rem" }}>check_circle</span>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#065f46" }}>{t("hold.requestReceived")}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={onOpenRequestForm}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              width: "100%", padding: "0.875rem 1rem",
              background: "#16649c", color: "white", border: "none",
              borderRadius: "10px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>contact_support</span>
            {requestSent ? t("hold.writeMoreRequest") : t("hold.writeRequest")}
          </button>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "0.75rem 1rem",
              background: "white", color: "#64748b", border: "1px solid #e2e8f0",
              borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
            }}
          >
            {t("hold.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChurchLayout;
