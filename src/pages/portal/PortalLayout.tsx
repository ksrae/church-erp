import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";
import { useMyChurchId } from "../../components/RequireMyChurch";
import PortalInquiryModal from "../../components/PortalInquiryModal";
import { useLocale } from "../../i18n/LocaleContext";
import { LanguageSelector } from "../../i18n/LanguageSelector";

function PortalLayout() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const myChurchId = useMyChurchId();
  const [church, setChurch] = useState<Church | null>(null);
  const [inquiryDefault, setInquiryDefault] = useState<"portal_registration" | "portal_general" | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!myChurchId) { setChurch(null); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "churches", myChurchId));
        if (snap.exists()) setChurch({ id: snap.id, ...snap.data() } as Church);
        else setChurch(null);
      } catch { setChurch(null); }
    })();
  }, [myChurchId]);

  const navItems = [
    { path: "/", label: t("portal.nav.home"), icon: "home", end: true },
    { path: "/notices", label: t("portal.nav.notices"), icon: "campaign" },
    { path: "/schedule", label: t("portal.nav.schedule"), icon: "calendar_month" },
    { path: "/churches", label: t(myChurchId ? "portal.nav.changeChurch" : "portal.nav.selectChurch"), icon: "swap_horiz" },
  ];

  const logoTitle = church?.name || t("portal.defaultTitle");
  const logoSubtitle = church ? (church.tagline || "CHURCH PORTAL") : "ZION CHURCH PORTAL";

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Noto Sans KR', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* 상단 유틸리티 바 */}
      <div style={{ background: "#0f172a", color: "#cbd5e1", fontSize: "0.75rem" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 1.25rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1.25rem" }}>
          <LanguageSelector
            variant="compact"
            style={{
              color: "#cbd5e1",
              fontSize: "0.75rem",
              padding: "2px 4px",
              borderRadius: "4px",
            }}
          />
          <span style={{ color: "#334155" }}>|</span>
          <Link to="/admin/login" style={{ color: "#cbd5e1", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>manage_accounts</span>
            {t("portal.util.adminLogin")}
          </Link>
          <span style={{ color: "#334155" }}>|</span>
          <button
            type="button"
            onClick={() => setInquiryDefault("portal_general")}
            style={{ color: "#cbd5e1", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: "0.75rem", fontFamily: "inherit" }}
          >
            {t("portal.util.inquiry")}
          </button>
        </div>
      </div>

      {/* 메인 헤더 */}
      <header style={{ background: "white", borderBottom: `1px solid ${scrolled ? "#e2e8f0" : "transparent"}`, position: "sticky", top: 0, zIndex: 100, boxShadow: scrolled ? "0 2px 8px rgba(15, 23, 42, 0.04)" : "none", transition: "all 0.2s" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "4.25rem" }}>
          {/* 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: "2.5rem", height: "2.5rem", background: church?.logo ? "#eff6ff" : "linear-gradient(135deg, #16649c 0%, #0d4f7a 100%)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(22, 100, 156, 0.25)", overflow: "hidden" }}>
              {church?.logo ? (
                <img src={church.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="material-symbols-outlined" style={{ color: "white", fontSize: "1.375rem" }}>church</span>
              )}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", margin: 0, letterSpacing: "-0.02em", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logoTitle}</p>
              <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0, letterSpacing: "0.08em", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logoSubtitle}</p>
            </div>
          </div>

          {/* 데스크탑 내비게이션 */}
          <nav style={{ display: "flex", gap: "0.125rem", alignItems: "center" }} className="portal-desktop-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                style={({ isActive }) => ({
                  position: "relative",
                  padding: "1.5rem 1.125rem",
                  fontSize: "0.95rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#16649c" : "#334155",
                  textDecoration: "none",
                  transition: "color 0.15s",
                })}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span style={{ position: "absolute", bottom: 0, left: "0.75rem", right: "0.75rem", height: "3px", background: "#16649c", borderRadius: "2px 2px 0 0" }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* 모바일 메뉴 버튼 */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", display: "none", padding: "0.5rem" }} className="portal-menu-btn">
            <span className="material-symbols-outlined" style={{ fontSize: "1.5rem" }}>{menuOpen ? "close" : "menu"}</span>
          </button>
        </div>

        {/* 모바일 내비게이션 */}
        {menuOpen && (
          <div style={{ borderTop: "1px solid #e2e8f0", background: "white" }} className="portal-mobile-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "1rem 1.5rem", fontSize: "1rem",
                  color: isActive ? "#16649c" : "#334155",
                  background: isActive ? "#eff6ff" : "transparent",
                  textDecoration: "none", borderBottom: "1px solid #f1f5f9",
                  fontWeight: isActive ? 600 : 500,
                })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <style>{`
        .portal-page-container { max-width: 1240px; margin: 0 auto; padding: 2rem 1.25rem; }
      `}</style>

      <footer style={{ background: "#0f172a", color: "#cbd5e1", marginTop: "4rem" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "3rem 1.25rem 2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <div style={{ width: "2rem", height: "2rem", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "white", fontSize: "1.125rem" }}>church</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "white" }}>{logoTitle}</span>
              </div>
              <p style={{ fontSize: "0.8rem", lineHeight: 1.7, color: "#94a3b8", margin: 0, whiteSpace: "pre-line" }}>
                {t("portal.footer.tagline")}
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", marginBottom: "0.875rem" }}>{t("portal.footer.shortcut")}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {navItems.map((n) => (
                  <li key={n.path}>
                    <Link to={n.path} style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "0.85rem" }}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", marginBottom: "0.875rem" }}>{t("portal.footer.admin")}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><Link to="/admin/login" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "0.85rem" }}>{t("portal.util.adminLogin")}</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setInquiryDefault("portal_registration")}
                    style={{ color: "#cbd5e1", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: "0.85rem", fontFamily: "inherit" }}
                  >
                    {t("portal.footer.churchInquiry")}
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{t("portal.footer.copyright", { year: new Date().getFullYear() })}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{t("portal.footer.poweredBy")}</p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .portal-desktop-nav { display: none !important; }
          .portal-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .portal-mobile-nav { display: none !important; }
        }
      `}</style>

      {inquiryDefault && (
        <PortalInquiryModal
          defaultContext={inquiryDefault}
          onClose={() => setInquiryDefault(null)}
        />
      )}
    </div>
  );
}

export default PortalLayout;
