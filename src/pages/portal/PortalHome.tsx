import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";
import { Announcement, categoryLabels, categoryColors } from "../../types/announcement";
import { WorshipInstance, worshipTypeLabels, worshipTypeColors, isOneTimeEvent } from "../../types/worship";
import { useMyChurchId, clearMyChurchId } from "../../components/RequireMyChurch";

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
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.joyful-intro-bg {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6);
  padding: 8rem 1.25rem 6rem;
  border-bottom-left-radius: 48px;
  border-bottom-right-radius: 48px;
  color: white;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
.joyful-blob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150vw;
  height: 150vw;
  background: conic-gradient(from 0deg, transparent, rgba(236, 72, 153, 0.3), rgba(245, 158, 11, 0.3), transparent);
  animation: gradientBg 15s linear infinite;
  pointer-events: none;
}
.joyful-btn {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 1rem 2rem;
  background: white;
  color: #ec4899;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  font-weight: 800;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}
.joyful-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 15px 30px rgba(236, 72, 153, 0.3);
}
.joyful-card {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.4) !important;
  border-radius: 24px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  padding: 2rem !important;
}
.joyful-card:nth-child(1) { animation-delay: 0.1s; }
.joyful-card:nth-child(2) { animation-delay: 0.2s; }
.joyful-card:nth-child(3) { animation-delay: 0.3s; }
.joyful-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.15);
  z-index: 10;
}
.portal-hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  margin: 0.75rem 0 1rem;
  letter-spacing: -0.03em;
  text-shadow: 0 4px 10px rgba(0,0,0,0.1);
  animation: float 6s ease-in-out infinite;
}
`;

function PortalHome() {
  const navigate = useNavigate();
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
        교회 정보를 불러오는 중...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!church) {
    return (
      <div style={{ maxWidth: "640px", margin: "4rem auto", padding: "2rem", textAlign: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#f59e0b" }}>error</span>
        <h2 style={{ marginTop: "1rem" }}>선택하신 교회 정보를 찾을 수 없습니다.</h2>
        <button onClick={() => { clearMyChurchId(); navigate("/churches"); }} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", background: "#16649c", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
          다른 교회 선택하기
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
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1e3a8a, #0f172a)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.75) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
          <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "2rem 1.25rem 2.5rem", width: "100%", color: "white" }}>
            {church.tagline && (
              <p style={{ fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 600, color: "#93c5fd", margin: 0 }}>
                {church.tagline}
              </p>
            )}
            <h1 className="portal-hero-title">
              {church.name}
            </h1>
            {church.pastorName && (
              <p style={{ fontSize: "0.95rem", color: "#e2e8f0", margin: 0, opacity: 0.9 }}>
                담임 {church.pastorName}
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
            {church.address && <InfoCard icon="location_on" label="주소" value={church.address} />}
            {church.phone && <InfoCard icon="phone" label="연락처" value={church.phone} />}
            {church.email && <InfoCard icon="mail" label="이메일" value={church.email} />}
            {church.website && <InfoCard icon="language" label="웹사이트" value={church.website} href={church.website} />}
          </section>
        )}

        {/* 교회 소개 */}
        {church.description && (
          <section className="joyful-card" style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.75rem", color: "#0f172a" }}>교회 소개</h2>
            <p style={{ color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{church.description}</p>
          </section>
        )}

        {/* 공지 / 일정 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {/* 공지사항 */}
          {church.showAnnouncements !== false && (
            <section className="joyful-card">
              <SectionHeader title="공지사항" linkTo="/notices" />
              {announcements.length === 0 ? (
                <EmptyHint text="등록된 공지사항이 없습니다." />
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {announcements.map((a) => (
                    <li key={a.id}>
                      <Link to={`/notices`} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.625rem", borderRadius: "10px", textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", background: categoryColors[a.category].bg, color: categoryColors[a.category].text, fontWeight: 700, flexShrink: 0 }}>
                          {categoryLabels[a.category]}
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
              <SectionHeader title="다가오는 일정" linkTo="/schedule" />
              {upcomingEvents.length === 0 ? (
                <EmptyHint text="예정된 일정이 없습니다." />
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
                            {e.title || worshipTypeLabels[e.type]}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0", display: "flex", gap: "0.5rem" }}>
                            <span>{worshipTypeLabels[e.type]}</span>
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
          다른 교회를 보고 싶으세요? <Link to="/churches" style={{ color: "#16649c", fontWeight: 600 }}>내 교회 변경</Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo }: { title: string; linkTo: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>{title}</h2>
      <Link to={linkTo} style={{ fontSize: "0.8rem", color: "#16649c", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
        더보기 <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>chevron_right</span>
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
  return (
    <div>
      <style>{portalStyles}</style>
      <section className="joyful-intro-bg">
        <div className="joyful-blob"></div>
        <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: "0.8rem", letterSpacing: "0.2em", fontWeight: 600, opacity: 0.85, margin: 0 }}>CHURCH PORTAL</p>
          <h1 className="portal-hero-title">
            우리 교회를 한 곳에서
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.7, opacity: 0.92, margin: "0 auto 2rem", maxWidth: "640px" }}>
            공지사항, 예배 일정, 행사까지 — 교회의 모든 소식을 성도님과 함께 나눕니다.
            먼저 내 교회를 선택해 주세요.
          </p>
          <button
            className="joyful-btn"
            onClick={() => navigate("/churches")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.5rem", fontWeight: 900 }}>search</span>
            내 교회 찾기
          </button>
        </div>
      </section>

      <section className="portal-page-container">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1.5rem", textAlign: "center" }}>포탈 이용 안내</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {[
            { icon: "search", title: "1. 내 교회 찾기", desc: "교회명 또는 담임목사, 주소로 검색하여 내 교회를 선택합니다." },
            { icon: "home", title: "2. 교회 메인 보기", desc: "포탈 첫 화면이 내 교회의 주요 소식으로 변경됩니다." },
            { icon: "campaign", title: "3. 소식과 일정 확인", desc: "공지사항과 예배·행사 일정을 한 눈에 확인할 수 있습니다." },
          ].map((s) => (
            <div key={s.title} className="joyful-card">
              <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "16px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", boxShadow: "0 4px 10px rgba(59,130,246,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#3b82f6", fontSize: "1.85rem", fontWeight: 700 }}>{s.icon}</span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.375rem", color: "#0f172a" }}>{s.title}</h3>
              <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "2rem", padding: "1.25rem", background: "#f1f5f9", borderRadius: "12px", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
          아직 교회가 포탈에 등록되지 않았나요? <a href="mailto:farmyon@gmail.com" style={{ color: "#16649c", fontWeight: 600 }}>등록 문의</a>
        </div>
      </section>
    </div>
  );
}

export default PortalHome;
