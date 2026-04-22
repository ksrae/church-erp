import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";
import { Announcement, categoryColors } from "../../types/announcement";
import { WorshipInstance, worshipTypeColors, isOneTimeEvent } from "../../types/worship";
import { useMyChurchId, clearMyChurchId } from "../../components/RequireMyChurch";
import PortalInquiryModal from "../../components/PortalInquiryModal";
import { useLocale } from "../../i18n/LocaleContext";

const portalStyles = `
@keyframes gradientBg {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
@keyframes pulseGlow {
  0% { text-shadow: 0 0 10px rgba(255,255,255,0.4); }
  50% { text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(236, 72, 153, 0.6); }
  100% { text-shadow: 0 0 10px rgba(255,255,255,0.4); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Intro Background with local generated image & selective overlay for legibility */
.joyful-intro-bg {
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(to bottom, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.75) 100%),
    url('/church_portal_hero.png') center/cover no-repeat;
  padding: 10rem 1.25rem 6rem;
  border-bottom-left-radius: 48px;
  border-bottom-right-radius: 48px;
  color: white;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.joyful-blob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150vw;
  height: 150vw;
  background: conic-gradient(from 0deg, transparent, rgba(236, 72, 153, 0.15), rgba(245, 158, 11, 0.15), transparent);
  animation: gradientBg 25s linear infinite;
  pointer-events: none;
}

.joyful-btn {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #1e40af;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 100px;
  cursor: pointer;
  font-weight: 900;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.joyful-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 15px 35px rgba(255, 255, 255, 0.4);
  background: white;
}

/* Glassmorphism Cards */
.joyful-card {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: fadeInUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.7) !important;
  border-radius: 24px !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
  padding: 2rem !important;
}

.joyful-card:nth-child(1) { animation-delay: 0.1s; }
.joyful-card:nth-child(2) { animation-delay: 0.2s; }
.joyful-card:nth-child(3) { animation-delay: 0.3s; }

.joyful-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 30px 60px -15px rgba(59, 130, 246, 0.2);
  background: rgba(255, 255, 255, 0.98) !important;
  z-index: 10;
}

.hero-glass-pill {
  background: rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(12px);
  padding: 3.5rem 4.5rem;
  border-radius: 40px;
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
  margin-bottom: 2rem;
  animation: fadeInUp 0.8s ease-out forwards;
}

/* Text readability enhancements */
.portal-hero-title {
  color: #ffffff !important;
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 900;
  margin: 0.75rem 0 1rem;
  letter-spacing: -0.04em;
  text-shadow: 0 4px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6);
  line-height: 1.2;
}

.portal-hero-subtitle {
  color: #f1f5f9 !important;
  font-size: 1.2rem;
  line-height: 1.8;
  opacity: 1 !important;
  margin: 0 auto 2.5rem;
  max-width: 680px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.9);
  font-weight: 600;
}

.portal-tagline {
  font-size: 0.95rem;
  letter-spacing: 0.25em;
  font-weight: 900;
  color: #93c5fd !important;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  animation: pulseGlow 4s infinite;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.card-desc {
  font-size: 0.95rem;
  color: #334155;
  line-height: 1.6;
  margin: 0;
  font-weight: 500;
}
`;

function PortalHome() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const myChurchId = useMyChurchId();
  const [church, setChurch] = useState<Church | null>(null);
  const [isLoadingChurch, setIsLoadingChurch] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<WorshipInstance[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!myChurchId) {
      setChurch(null); setAnnouncements([]); setUpcomingEvents([]);
      return;
    }
    (async () => {
      setIsLoadingChurch(true);
      try {
        const snap = await getDoc(doc(db, "churches", myChurchId));
        setChurch(snap.exists() ? ({ id: snap.id, ...snap.data() } as Church) : null);
      } catch { setChurch(null); }
      setIsLoadingChurch(false);
    })();
  }, [myChurchId]);

  useEffect(() => {
    if (!myChurchId || !church) return;
    (async () => {
      try {
        if (church.showAnnouncements !== false) {
          const annSnap = await getDocs(query(
            collection(db, "announcements"),
            where("churchId", "==", myChurchId),
            where("status", "==", "published"),
            orderBy("startDate", "desc"),
            limit(5),
          )).catch(() => null);
          if (annSnap) setAnnouncements(annSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
        } else {
          setAnnouncements([]);
        }

        if (church.showSchedule !== false) {
          const today = new Date().toISOString().split("T")[0];
          const instSnap = await getDocs(query(
            collection(db, "worshipInstances"),
            where("churchId", "==", myChurchId),
            where("isPublished", "==", true),
            orderBy("date", "asc"),
          )).catch(() => null);
          if (instSnap) {
            const all = instSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipInstance));
            const future = all
              .filter((i) => isOneTimeEvent(i.type) && (i.endDate || i.date) >= today)
              .slice(0, 6);
            setUpcomingEvents(future);
          }
        } else {
          setUpcomingEvents([]);
        }
      } catch (e) { console.error(e); }
    })();
  }, [myChurchId, church]);

  // auto-rotate church photos
  useEffect(() => {
    const photos = church?.photos || [];
    if (photos.length <= 1) return;
    const t = setInterval(() => setPhotoIndex((p) => (p + 1) % photos.length), 5000);
    return () => clearInterval(t);
  }, [church?.photos]);

  // ─────────────────── 교회 미선택 상태 (제품 소개) ───────────────────
  if (!myChurchId) {
    return <ProductIntro />;
  }

  if (isLoadingChurch) {
    return (
      <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite", display: "block", marginBottom: "1rem" }}>autorenew</span>
        {t("portal.home.loadingChurch")}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!church) {
    return (
      <div style={{ maxWidth: "640px", margin: "4rem auto", padding: "2rem", textAlign: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#f59e0b" }}>error</span>
        <h2 style={{ marginTop: "1rem" }}>{t("portal.home.churchNotFound")}</h2>
        <button onClick={() => { clearMyChurchId(); navigate("/churches"); }} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", background: "#16649c", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
          {t("portal.home.pickAnother")}
        </button>
      </div>
    );
  }

  const photos = church.photos || [];
  const currentPhoto = photos[photoIndex];

  return (
    <div>
      <style>{portalStyles}</style>
      {/* Hero */}
      <section style={{ position: "relative", height: "clamp(320px, 48vh, 520px)", overflow: "hidden", background: "#0f172a", borderBottomLeftRadius: "32px", borderBottomRightRadius: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
        {photos.length > 0 ? (
          photos.map((url, idx) => (
            <div key={url}
              style={{
                position: "absolute", inset: 0, backgroundImage: `url(${url})`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: idx === photoIndex ? 1 : 0, transition: "opacity 1s ease-in-out",
              }} />
          ))
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "url('/church_portal_hero.png') center/cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
          <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "2rem 1.25rem 3.5rem", width: "100%", color: "white", position: "relative", zIndex: 2 }}>
            {church.tagline && (
              <p className="portal-tagline" style={{ display: "inline-block", background: "rgba(15,23,42,0.6)", padding: "0.25rem 0.75rem", borderRadius: "100px", backdropFilter: "blur(8px)" }}>
                {church.tagline}
              </p>
            )}
            <h1 className="portal-hero-title" style={{ animation: "slideInRight 0.8s ease-out forwards", opacity: 0, textShadow: "0 4px 15px rgba(0,0,0,1)" }}>
              {church.name}
            </h1>
            {church.pastorName && (
              <p style={{ fontSize: "1.15rem", color: "#ffffff", margin: 0, fontWeight: 700, textShadow: "0 2px 8px rgba(0,0,0,0.8)", animation: "fadeInUp 1s ease-out forwards", opacity: 0, animationDelay: "0.2s" }}>
                {t("portal.home.pastorPrefix", { name: church.pastorName })}
              </p>
            )}
          </div>
        </div>
        {/* photo indicators */}
        {photos.length > 1 && (
          <div style={{ position: "absolute", bottom: "0.75rem", right: "1rem", display: "flex", gap: "0.375rem" }}>
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPhotoIndex(idx)}
                aria-label={`slide ${idx + 1}`}
                style={{
                  width: idx === photoIndex ? "24px" : "8px", height: "8px",
                  borderRadius: "4px", border: "none",
                  background: idx === photoIndex ? "white" : "rgba(255,255,255,0.45)",
                  cursor: "pointer", transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="portal-page-container">
        {/* 주요 정보 */}
        {(church.address || church.phone || church.website || church.email) && (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
            {church.address && <InfoCard icon="location_on" label={t("portal.home.infoAddress")} value={church.address} />}
            {church.phone && <InfoCard icon="phone" label={t("portal.home.infoPhone")} value={church.phone} />}
            {church.email && <InfoCard icon="mail" label={t("portal.home.infoEmail")} value={church.email} />}
            {church.website && <InfoCard icon="language" label={t("portal.home.infoWebsite")} value={church.website} href={church.website} />}
          </section>
        )}

        {/* 교회 소개 */}
        {church.description && (
          <section className="joyful-card" style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.75rem", color: "#0f172a" }}>{t("portal.home.aboutChurch")}</h2>
            <p style={{ color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{church.description}</p>
          </section>
        )}

        {/* 공지 / 일정 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {/* 공지사항 */}
          {church.showAnnouncements !== false && (
            <section className="joyful-card">
              <SectionHeader title={t("portal.home.announcements")} linkTo="/notices" moreLabel={t("portal.home.seeMore")} />
              {announcements.length === 0 ? (
                <EmptyHint text={t("portal.home.noAnnouncements")} />
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {announcements.map((a) => (
                    <li key={a.id}>
                      <Link to={`/notices`} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.625rem", borderRadius: "10px", textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", background: categoryColors[a.category].bg, color: categoryColors[a.category].text, fontWeight: 700, flexShrink: 0 }}>
                          {t(`announcement.category.${a.category}` as const)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.isPinned && <span style={{ color: "#dc2626", marginRight: "0.25rem" }}>📌</span>}
                            {a.title}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0" }}>{a.startDate}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 다가오는 일정 */}
          {church.showSchedule !== false && (
            <section className="joyful-card">
              <SectionHeader title={t("portal.home.upcomingEvents")} linkTo="/schedule" moreLabel={t("portal.home.seeMore")} />
              {upcomingEvents.length === 0 ? (
                <EmptyHint text={t("portal.home.noUpcoming")} />
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {upcomingEvents.map((e) => (
                    <li key={e.id}>
                      <Link to="/schedule" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem", borderRadius: "10px", textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: "3rem", flexShrink: 0, textAlign: "center", padding: "0.375rem 0", borderRadius: "8px", background: worshipTypeColors[e.type] + "18", color: worshipTypeColors[e.type], fontWeight: 700, fontSize: "0.75rem" }}>
                          {e.date.slice(5).replace("-", ".")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.title || t(`worship.type.${e.type}` as const)}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0", display: "flex", gap: "0.5rem" }}>
                            <span>{t(`worship.type.${e.type}` as const)}</span>
                            {e.time && <span>· {e.time}</span>}
                            {e.location && <span>· {e.location}</span>}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* 교회 변경 안내 */}
        <div style={{ marginTop: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
          {t("portal.home.switchChurchHint")} <Link to="/churches" style={{ color: "#16649c", fontWeight: 600 }}>{t("portal.home.switchChurchLink")}</Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo, moreLabel }: { title: string; linkTo: string; moreLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>{title}</h2>
      <Link to={linkTo} style={{ fontSize: "0.8rem", color: "#16649c", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
        {moreLabel} <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>chevron_right</span>
      </Link>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>{text}</div>
  );
}

function InfoCard({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
      <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.25rem" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0, fontWeight: 600, letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ fontSize: "0.85rem", color: "#0f172a", margin: "2px 0 0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
  if (href) return <a href={href.startsWith("http") ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{content}</a>;
  return content;
}

function ProductIntro() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const steps = [
    { icon: "search", title: t("portal.intro.step1.title"), desc: t("portal.intro.step1.desc") },
    { icon: "home", title: t("portal.intro.step2.title"), desc: t("portal.intro.step2.desc") },
    { icon: "campaign", title: t("portal.intro.step3.title"), desc: t("portal.intro.step3.desc") },
  ];
  return (
    <div>
      <style>{portalStyles}</style>
      <section className="joyful-intro-bg">
        <div className="joyful-blob"></div>
        <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 3 }}>
          <div className="hero-glass-pill">
            <p className="portal-tagline" style={{ display: "inline-block", marginBottom: "0.5rem" }}>{t("portal.intro.tagline")}</p>
            <h1 className="portal-hero-title">
              {t("portal.intro.title")}
            </h1>
            <p className="portal-hero-subtitle" style={{ marginBottom: 0, whiteSpace: "pre-line" }}>
              {t("portal.intro.subtitle")}
            </p>
          </div>
          <br />
          <button
            className="joyful-btn"
            onClick={() => navigate("/churches")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.5rem", fontWeight: 900 }}>search</span>
            {t("portal.intro.findChurch")}
          </button>
        </div>
      </section>

      <section className="portal-page-container">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1.5rem", textAlign: "center" }}>{t("portal.intro.guide")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {steps.map((s) => (
            <div key={s.title} className="joyful-card">
              <div style={{ width: "4rem", height: "4rem", borderRadius: "20px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", boxShadow: "0 8px 15px rgba(59,130,246,0.15)", animation: "float 6s ease-in-out infinite" }}>
                <span className="material-symbols-outlined" style={{ color: "#2563eb", fontSize: "2rem", fontWeight: 700 }}>{s.icon}</span>
              </div>
              <h3 className="card-title">{s.title}</h3>
              <p className="card-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "2rem", padding: "1.25rem", background: "#f1f5f9", borderRadius: "12px", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
          {t("portal.intro.notRegistered")}{" "}
          <button
            type="button"
            onClick={() => setInquiryOpen(true)}
            style={{ color: "#16649c", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: "0.85rem", fontFamily: "inherit", textDecoration: "underline" }}
          >
            {t("portal.intro.registerInquiry")}
          </button>
        </div>
      </section>

      {inquiryOpen && (
        <PortalInquiryModal
          defaultContext="portal_registration"
          onClose={() => setInquiryOpen(false)}
        />
      )}
    </div>
  );
}

export default PortalHome;
