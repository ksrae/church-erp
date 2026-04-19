import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Church, PortalPost, PortalHero, portalPostTypeLabels, portalPostTypeColors } from "../../types/church";
import { Announcement, categoryLabels, categoryColors } from "../../types/announcement";
import { WorshipInstance, worshipTypeLabels } from "../../types/worship";
import { useMyChurchId, setMyChurchId as setMyChurchIdStore, clearMyChurchId } from "../../components/RequireMyChurch";
import { fetchAllNews, NewsItem } from "../../utils/newsRss";

function PortalHome() {
  const [heroes, setHeroes] = useState<PortalHero[]>([]);
  const [currentHero, setCurrentHero] = useState(0);
  const [churches, setChurches] = useState<Church[]>([]);
  const myChurchId = useMyChurchId();
  const [globalPosts, setGlobalPosts] = useState<PortalPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<PortalPost[]>([]);
  const [recentWorships, setRecentWorships] = useState<WorshipInstance[]>([]);
  const [churchAnnouncements, setChurchAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showChurchPicker, setShowChurchPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "notice" | "news" | "event" | "sermon">("all");

  useEffect(() => { loadData(); loadNews(); }, []);
  useEffect(() => {
    if (myChurchId) loadChurchContent(myChurchId);
    else { setChurchAnnouncements([]); setRecentWorships([]); }
  }, [myChurchId]);

  const loadNews = async () => {
    try {
      const items = await fetchAllNews(5);
      setNews(items.slice(0, 8));
    } catch { setNews([]); }
  };

  useEffect(() => {
    if (heroes.length <= 1) return;
    const timer = setInterval(() => setCurrentHero((p) => (p + 1) % heroes.length), 5000);
    return () => clearInterval(timer);
  }, [heroes.length]);

  const loadData = async () => {
    try {
      const [churchSnap, heroSnap, postSnap] = await Promise.all([
        getDocs(query(collection(db, "churches"), where("isActive", "==", true))),
        getDocs(query(collection(db, "portalHeroes"), where("isActive", "==", true), orderBy("order", "asc"))).catch(() => ({ docs: [] as any[] })),
        getDocs(query(collection(db, "portalPosts"), where("isPublished", "==", true), orderBy("isPinned", "desc"), orderBy("createdAt", "desc"), limit(20))),
      ]);
      setChurches(churchSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
      setHeroes(heroSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PortalHero)));
      const posts = postSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PortalPost));
      setGlobalPosts(posts);
      setFeaturedPosts(posts.filter((p) => p.isFeatured).slice(0, 3));
    } catch (e) { console.error(e); }
  };

  const loadChurchContent = async (churchId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [annSnap, worshipSnap] = await Promise.all([
        getDocs(query(
          collection(db, "announcements"),
          where("churchId", "==", churchId),
          where("status", "==", "published"),
          orderBy("isPinned", "desc"),
          orderBy("startDate", "desc"),
          limit(5)
        )),
        getDocs(query(
          collection(db, "worshipInstances"),
          where("churchId", "==", churchId),
          where("isPublished", "==", true),
          orderBy("date", "desc"),
          limit(4)
        )).catch(() => ({ docs: [] as any[] })),
      ]);
      const all = annSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)).filter((a) => !a.endDate || a.endDate >= today);
      setChurchAnnouncements(all);
      setRecentWorships(worshipSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WorshipInstance)));
    } catch { setChurchAnnouncements([]); setRecentWorships([]); }
  };

  const selectMyChurch = (church: Church) => {
    setMyChurchIdStore(church.id);
    setShowChurchPicker(false);
  };

  const clearMyChurch = () => {
    clearMyChurchId();
  };

  const myChurch = churches.find((c) => c.id === myChurchId);
  const filteredPosts = activeTab === "all" ? globalPosts : globalPosts.filter((p) => p.type === activeTab);

  const hero = heroes[currentHero];

  // 기본 Hero (관리자가 등록하지 않았을 때 표시할 기본 화면)
  const defaultHero = {
    title: "말씀 안에서 하나 되는 교회",
    subtitle: "주일 예배, 주보, 공지를 한 곳에서 확인하세요.",
    gradient: "linear-gradient(135deg, #16649c 0%, #0f3a5f 60%, #082238 100%)",
  };

  return (
    <div>
      {/* ==================== HERO SLIDER ==================== */}
      <section style={{ position: "relative", height: "clamp(320px, 48vh, 520px)", overflow: "hidden", background: hero ? "#0f172a" : defaultHero.gradient }}>
        {hero ? (
          <>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${hero.imageUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              transition: "opacity 0.6s",
            }} />
            <div style={{ position: "absolute", inset: 0, background: hero.overlayColor || "linear-gradient(90deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.45) 60%, rgba(15,23,42,0.2) 100%)" }} />
          </>
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99,102,241,0.2) 0%, transparent 50%)" }} />
          </>
        )}

        <div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", padding: "0 1.5rem", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", color: "white" }}>
          <div style={{ maxWidth: "640px" }}>
            <span style={{ display: "inline-block", background: "rgba(59,130,246,0.25)", color: "#93c5fd", padding: "0.375rem 0.875rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "1.25rem", border: "1px solid rgba(147,197,253,0.3)" }}>
              CHURCH PORTAL
            </span>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 800, lineHeight: 1.25, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
              {hero ? hero.title : defaultHero.title}
            </h1>
            <p style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: "0 0 1.75rem", maxWidth: "520px" }}>
              {hero ? hero.subtitle : defaultHero.subtitle}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {hero?.linkUrl ? (
                <a href={hero.linkUrl} target={hero.linkUrl.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                   style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "white", color: "#0f172a", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem" }}>
                  {hero.ctaLabel || "자세히 보기"}
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>arrow_forward</span>
                </a>
              ) : (
                <Link to="/notices" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "white", color: "#0f172a", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem" }}>
                  소식 보기
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>arrow_forward</span>
                </Link>
              )}
              <Link to="/bulletins" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "10px", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem", backdropFilter: "blur(6px)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>menu_book</span>
                주보 다운로드
              </Link>
            </div>
          </div>

          {/* Slider indicators */}
          {heroes.length > 1 && (
            <div style={{ position: "absolute", bottom: "1.5rem", left: "1.5rem", display: "flex", gap: "0.5rem" }}>
              {heroes.map((_, i) => (
                <button key={i} onClick={() => setCurrentHero(i)}
                        style={{ width: i === currentHero ? "2rem" : "0.625rem", height: "0.3rem", borderRadius: "3px", background: i === currentHero ? "white" : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", transition: "width 0.3s" }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== QUICK ACCESS CARDS ==================== */}
      <section style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 1.25rem", marginTop: "-2.5rem", position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { icon: "menu_book", label: "이번 주 주보", sub: "예배 순서 · 설교 말씀", to: "/bulletins", color: "#3b82f6" },
            { icon: "campaign", label: "교회 소식", sub: "공지사항 · 행사", to: "/notices", color: "#10b981" },
            { icon: "calendar_month", label: "일정", sub: "월별 예배 · 모임", to: "/schedule", color: "#f59e0b" },
            { icon: myChurch ? "star" : "add_circle", label: myChurch ? myChurch.name : "내 교회 설정", sub: myChurch ? (myChurch.pastorName ? `담임 ${myChurch.pastorName}` : "내 교회 소식 바로가기") : "즐겨찾기 교회 지정", onClick: () => setShowChurchPicker(true), color: "#7c3aed" },
          ].map((card, i) => {
            const Wrap = card.to ? Link : "button" as any;
            const wrapProps = card.to ? { to: card.to } : { onClick: card.onClick, type: "button" };
            return (
              <Wrap key={i} {...wrapProps}
                    style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "1.125rem 1.25rem", background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 14px rgba(15,23,42,0.06)", textDecoration: "none", color: "inherit", cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
                <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "10px", background: `${card.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: card.color, fontSize: "1.375rem" }}>{card.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.label}</p>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.sub}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: "#cbd5e1", fontSize: "1.125rem" }}>chevron_right</span>
              </Wrap>
            );
          })}
        </div>
      </section>

      {/* ==================== FEATURED SECTION ==================== */}
      {featuredPosts.length > 0 && (
        <section style={{ maxWidth: "1240px", margin: "3.5rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>FEATURED</p>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.015em" }}>주목할 소식</h2>
            </div>
            <Link to="/notices" style={{ color: "#64748b", fontSize: "0.875rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              전체보기 <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>chevron_right</span>
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {featuredPosts.map((post) => (
              <article key={post.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0", transition: "all 0.2s", cursor: post.linkUrl ? "pointer" : "default" }}
                       onClick={() => post.linkUrl && window.open(post.linkUrl, post.linkUrl.startsWith("http") ? "_blank" : "_self")}>
                <div style={{ height: "180px", background: post.imageUrl ? `url(${post.imageUrl}) center/cover` : `linear-gradient(135deg, ${portalPostTypeColors[post.type].text} 0%, ${portalPostTypeColors[post.type].bg} 100%)`, position: "relative" }}>
                  {!post.imageUrl && (
                    <span className="material-symbols-outlined" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", color: "rgba(255,255,255,0.6)" }}>
                      {post.type === "sermon" ? "auto_stories" : post.type === "event" ? "celebration" : post.type === "news" ? "newspaper" : "campaign"}
                    </span>
                  )}
                  <span style={{ position: "absolute", top: "0.875rem", left: "0.875rem", padding: "0.25rem 0.625rem", borderRadius: "6px", background: "rgba(255,255,255,0.95)", color: portalPostTypeColors[post.type].text, fontSize: "0.7rem", fontWeight: 700 }}>
                    {portalPostTypeLabels[post.type]}
                  </span>
                </div>
                <div style={{ padding: "1.125rem 1.25rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.content}</p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.75rem 0 0" }}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ==================== MY CHURCH SECTION ==================== */}
      {myChurch && (
        <section style={{ maxWidth: "1240px", margin: "3.5rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ background: "linear-gradient(135deg, #16649c 0%, #0d4f7a 100%)", borderRadius: "16px", padding: "1.75rem 2rem", color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", bottom: "-40px", right: "80px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", letterSpacing: "0.1em", fontWeight: 600, margin: 0 }}>MY CHURCH</p>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.25rem 0 0.375rem", letterSpacing: "-0.015em" }}>{myChurch.name}</h2>
                {myChurch.pastorName && <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>담임목사 {myChurch.pastorName}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setShowChurchPicker(true)} style={{ padding: "0.5rem 0.875rem", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>교회 변경</button>
                <button onClick={clearMyChurch} style={{ padding: "0.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.8)", cursor: "pointer", display: "flex" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                </button>
              </div>
            </div>
            {churchAnnouncements.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", margin: 0, position: "relative" }}>아직 등록된 교회 소식이 없습니다.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", position: "relative" }}>
                {churchAnnouncements.map((a) => (
                  <Link key={a.id} to={`/notices#${a.id}`} style={{ padding: "0.875rem 1rem", background: "rgba(255,255,255,0.12)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none", color: "white", backdropFilter: "blur(6px)" }}>
                    <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.375rem" }}>
                      <span style={{ fontSize: "0.7rem", padding: "1px 7px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", fontWeight: 600 }}>
                        {categoryLabels[a.category]}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 0.25rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.title}</p>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>{a.startDate}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== ALL NEWS ==================== */}
      <section style={{ maxWidth: "1240px", margin: "3.5rem auto 0", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>LATEST</p>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.015em" }}>최신 소식 & 뉴스</h2>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto" }}>
            {(["all", "notice", "news", "event", "sermon"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                      style={{ padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid",
                               borderColor: activeTab === t ? "#0f172a" : "#e2e8f0",
                               background: activeTab === t ? "#0f172a" : "white",
                               color: activeTab === t ? "white" : "#475569",
                               cursor: "pointer", fontSize: "0.82rem", fontWeight: activeTab === t ? 700 : 500, whiteSpace: "nowrap" }}>
                {t === "all" ? "전체" : portalPostTypeLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>newspaper</span>
            등록된 소식이 없습니다.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {filteredPosts.slice(0, 8).map((post) => (
              <article key={post.id}
                       onClick={() => post.linkUrl && window.open(post.linkUrl, post.linkUrl.startsWith("http") ? "_blank" : "_self")}
                       style={{ background: "white", borderRadius: "12px", padding: "1.125rem 1.25rem", border: "1px solid #e2e8f0", cursor: post.linkUrl ? "pointer" : "default", display: "flex", flexDirection: "column", gap: "0.5rem", transition: "all 0.15s" }}>
                <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                  {post.isPinned && <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: "1rem" }}>push_pin</span>}
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: portalPostTypeColors[post.type].bg, color: portalPostTypeColors[post.type].text, fontWeight: 700 }}>
                    {portalPostTypeLabels[post.type]}
                  </span>
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.title}</h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.content}</p>
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0 }}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ==================== CHRISTIAN NEWS (RSS) ==================== */}
      {news.length > 0 && (
        <section style={{ maxWidth: "1240px", margin: "3.5rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>CHRISTIAN NEWS</p>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.015em" }}>기독교 뉴스</h2>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>주요 기독교 매체의 최신 소식을 자동으로 가져옵니다.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                 style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", transition: "all 0.15s" }}>
                {item.thumbnail && (
                  <div style={{ height: "160px", background: `url(${item.thumbnail}) center/cover`, borderBottom: "1px solid #f1f5f9" }} />
                )}
                <div style={{ padding: "1rem 1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>
                      {item.source}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {item.pubDate ? new Date(item.pubDate).toLocaleDateString("ko-KR") : ""}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ==================== RECENT WORSHIPS ==================== */}
      {recentWorships.length > 0 && (
        <section style={{ maxWidth: "1240px", margin: "3.5rem auto 0", padding: "0 1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>WORSHIP</p>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.015em" }}>최근 예배 & 주보</h2>
            </div>
            <Link to="/bulletins" style={{ color: "#64748b", fontSize: "0.875rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              전체보기 <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>chevron_right</span>
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {recentWorships.map((w) => (
              <div key={w.id} style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>
                    {worshipTypeLabels[w.type]}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{w.date}</span>
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.375rem", lineHeight: 1.45 }}>{w.title || worshipTypeLabels[w.type]}</h3>
                {w.preacher && <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.5rem" }}>설교 {w.preacher}</p>}
                {w.scripture && <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>본문 {w.scripture}</p>}
                {w.bulletinFileUrl && (
                  <a href={w.bulletinFileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.875rem", color: "#16649c", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>download</span>
                    주보 다운로드
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== CHURCH DIRECTORY ==================== */}
      <section style={{ maxWidth: "1240px", margin: "3.5rem auto 4rem", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>DIRECTORY</p>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.015em" }}>등록된 교회 <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "1.125rem" }}>({churches.length})</span></h2>
          </div>
        </div>
        {churches.length === 0 ? (
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>business</span>
            등록된 교회가 없습니다.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.875rem" }}>
            {churches.map((church) => (
              <button key={church.id} onClick={() => selectMyChurch(church)}
                      style={{ textAlign: "left", background: church.id === myChurchId ? "#eff6ff" : "white", border: church.id === myChurchId ? "2px solid #16649c" : "1px solid #e2e8f0", borderRadius: "12px", padding: "1.125rem", cursor: "pointer", display: "flex", gap: "0.875rem", alignItems: "center", transition: "all 0.15s" }}>
                <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "10px", background: church.id === myChurchId ? "#16649c" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: church.id === myChurchId ? "white" : "#16649c", fontSize: "1.375rem" }}>church</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{church.name}</p>
                  {church.pastorName && <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>담임 {church.pastorName}</p>}
                </div>
                {church.id === myChurchId && <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.25rem" }}>star</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ==================== CHURCH PICKER MODAL ==================== */}
      {showChurchPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }} onClick={() => setShowChurchPicker(false)}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "480px", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1.125rem", margin: 0, color: "#0f172a" }}>내 교회 선택</h2>
              <button onClick={() => setShowChurchPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem", marginTop: 0 }}>소식을 우선 확인할 교회를 선택하세요.</p>
            {churches.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>등록된 교회가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {churches.map((church) => (
                  <button key={church.id} onClick={() => selectMyChurch(church)}
                          style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1rem", borderRadius: "10px",
                                   border: church.id === myChurchId ? "2px solid #16649c" : "1px solid #e2e8f0",
                                   background: church.id === myChurchId ? "#eff6ff" : "white",
                                   cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.5rem" }}>church</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, margin: 0, color: "#0f172a" }}>{church.name}</p>
                      {church.pastorName && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0" }}>담임목사 {church.pastorName}</p>}
                    </div>
                    {church.id === myChurchId && <span className="material-symbols-outlined" style={{ color: "#16649c" }}>check_circle</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalHome;
