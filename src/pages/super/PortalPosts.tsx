import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { PortalPost, PortalHero, portalPostTypeLabels, portalPostTypeColors } from "../../types/church";
import { NewsSource, clearNewsCache } from "../../utils/newsRss";

type Tab = "heroes" | "posts" | "news";

function PortalPosts() {
  const [tab, setTab] = useState<Tab>("heroes");

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>포탈 관리</h1>
        <p style={{ color: "#64748b", marginTop: "0.375rem", fontSize: "0.9rem" }}>메인 배너(Hero)와 공지·뉴스·행사를 관리합니다.</p>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.75rem" }}>
        {([
          { id: "heroes" as const, label: "Hero 배너", icon: "wallpaper", sub: "메인 상단 배너 이미지" },
          { id: "posts" as const, label: "게시물", icon: "newspaper", sub: "공지 · 뉴스 · 행사 · 말씀" },
          { id: "news" as const, label: "뉴스 피드", icon: "rss_feed", sub: "기독교 뉴스 RSS 자동 수집" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: "0.875rem 1.25rem", border: "none", background: "transparent", cursor: "pointer",
                           borderBottom: `2px solid ${tab === t.id ? "#1d4ed8" : "transparent"}`,
                           color: tab === t.id ? "#1d4ed8" : "#64748b",
                           fontWeight: tab === t.id ? 700 : 500, fontSize: "0.95rem",
                           display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "-1px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "heroes" ? <HeroesPanel /> : tab === "posts" ? <PostsPanel /> : <NewsFeedsPanel />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 뉴스 RSS 피드 관리
// ────────────────────────────────────────────────────────────────────────────

function NewsFeedsPanel() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NewsSource | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: "", rssUrl: "", order: 0, enabled: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "newsSources"), orderBy("order", "asc")));
      setSources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsSource)));
    } catch { setSources([]); }
    setIsLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", rssUrl: "", order: sources.length, enabled: true });
    setShowModal(true);
  };

  const openEdit = (s: NewsSource) => {
    setEditing(s);
    setForm({ name: s.name, rssUrl: s.rssUrl, order: s.order, enabled: s.enabled });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.rssUrl.trim()) { alert("매체명과 RSS URL을 입력하세요."); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        rssUrl: form.rssUrl.trim(),
        order: form.order,
        enabled: form.enabled,
        updatedAt: new Date().toISOString(),
      };
      if (editing) {
        await updateDoc(doc(db, "newsSources", editing.id), payload);
      } else {
        await addDoc(collection(db, "newsSources"), { ...payload, createdAt: new Date().toISOString(), createdAtTs: serverTimestamp() });
      }
      clearNewsCache();
      setShowModal(false);
      await load();
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (s: NewsSource) => {
    if (!confirm(`"${s.name}" RSS 피드를 삭제하시겠습니까?`)) return;
    await deleteDoc(doc(db, "newsSources", s.id));
    clearNewsCache();
    setSources((prev) => prev.filter((x) => x.id !== s.id));
  };

  const handleToggle = async (s: NewsSource) => {
    await updateDoc(doc(db, "newsSources", s.id), { enabled: !s.enabled });
    clearNewsCache();
    setSources((prev) => prev.map((x) => x.id === s.id ? { ...x, enabled: !s.enabled } : x));
  };

  const suggestedSources: { name: string; url: string }[] = [
    { name: "크리스천투데이", url: "https://www.christiantoday.co.kr/rss/allArticle.xml" },
    { name: "기독신문", url: "https://www.kidok.com/rss/allArticle.xml" },
    { name: "국민일보 미션라이프", url: "https://news.kmib.co.kr/rss/data/mlifeRss.xml" },
    { name: "뉴스앤조이", url: "https://www.newsnjoy.or.kr/rss/allArticle.xml" },
  ];

  const addSuggested = async (s: { name: string; url: string }) => {
    try {
      await addDoc(collection(db, "newsSources"), {
        name: s.name, rssUrl: s.url, order: sources.length, enabled: true,
        createdAt: new Date().toISOString(), createdAtTs: serverTimestamp(),
      });
      clearNewsCache();
      await load();
    } catch (e: any) { alert(`추가 실패: ${e.message}`); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.875rem", color: "#64748b", flex: 1, minWidth: "240px" }}>
          기독교 뉴스 RSS 피드를 등록하면 포탈 메인에 최신 기사가 자동으로 표시됩니다. (1시간 캐시)
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>add</span>
          피드 추가
        </button>
      </div>

      {!isLoading && sources.length === 0 && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem", color: "#1d4ed8", fontWeight: 700, fontSize: "0.9rem" }}>추천 피드 빠른 등록</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#3b82f6" }}>자주 사용되는 한국 기독교 매체입니다. 클릭하여 바로 등록할 수 있습니다.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {suggestedSources.map((s) => (
              <button key={s.url} onClick={() => addSuggested(s)}
                      style={{ padding: "0.5rem 0.875rem", background: "white", border: "1px solid #bfdbfe", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", color: "#1d4ed8", fontWeight: 600 }}>
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>불러오는 중...</div>
      ) : sources.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>rss_feed</span>
          <p style={{ color: "#64748b" }}>등록된 RSS 피드가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sources.map((s) => (
            <div key={s.id} style={{ background: "white", borderRadius: "10px", padding: "0.875rem 1.125rem", border: "1px solid #e2e8f0", display: "flex", gap: "0.875rem", alignItems: "center", opacity: s.enabled ? 1 : 0.55 }}>
              <span className="material-symbols-outlined" style={{ color: s.enabled ? "#1d4ed8" : "#94a3b8" }}>rss_feed</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{s.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.rssUrl}</p>
              </div>
              <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: s.enabled ? "#dcfce7" : "#f1f5f9", color: s.enabled ? "#16a34a" : "#64748b", fontWeight: 700 }}>
                {s.enabled ? "활성" : "비활성"}
              </span>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button onClick={() => handleToggle(s)} style={{ padding: "6px 10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", color: "#475569" }}>
                  {s.enabled ? "숨김" : "활성화"}
                </button>
                <button onClick={() => openEdit(s)} style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#64748b" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>edit</span>
                </button>
                <button onClick={() => handleDelete(s)} style={{ padding: "6px", background: "white", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#dc2626" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.75rem 2rem", width: "100%", maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>{editing ? "RSS 피드 수정" : "RSS 피드 추가"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>매체명 *</label>
              <input type="text" className="form-input" placeholder="예: 크리스천투데이" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>RSS URL *</label>
              <input type="text" className="form-input" placeholder="https://example.com/rss.xml" value={form.rssUrl} onChange={(e) => setForm((p) => ({ ...p, rssUrl: e.target.value }))} />
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem" }}>
                해당 매체의 RSS(XML) 피드 URL을 입력하세요. 브라우저에서 JSON 변환 API(rss2json)를 통해 자동 파싱됩니다.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "1rem", marginBottom: "1.5rem", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>정렬 순서</label>
                <input type="number" className="form-input" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", paddingBottom: "0.625rem" }}>
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>활성화 (포탈에 노출)</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "0.625rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}>취소</button>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: "0.625rem 1.5rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HERO 배너 관리
// ────────────────────────────────────────────────────────────────────────────

function HeroesPanel() {
  const [heroes, setHeroes] = useState<PortalHero[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PortalHero | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", linkUrl: "", ctaLabel: "", order: 0, isActive: true, overlayColor: "" });

  useEffect(() => { loadHeroes(); }, []);

  const loadHeroes = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "portalHeroes"), orderBy("order", "asc")));
      setHeroes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortalHero)));
    } catch { setHeroes([]); }
    setIsLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", ctaLabel: "", order: heroes.length, isActive: true, overlayColor: "" });
    setShowModal(true);
  };

  const openEdit = (h: PortalHero) => {
    setEditing(h);
    setForm({ title: h.title, subtitle: h.subtitle || "", imageUrl: h.imageUrl, linkUrl: h.linkUrl || "", ctaLabel: h.ctaLabel || "", order: h.order, isActive: h.isActive, overlayColor: h.overlayColor || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) { alert("제목과 이미지 URL을 입력하세요."); return; }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        order: form.order,
        isActive: form.isActive,
        overlayColor: form.overlayColor.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      if (editing) {
        await updateDoc(doc(db, "portalHeroes", editing.id), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "portalHeroes"), { ...payload, createdAt: new Date().toISOString(), createdAtTs: serverTimestamp() });
      }
      setShowModal(false);
      await loadHeroes();
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (h: PortalHero) => {
    if (!confirm(`"${h.title}" 배너를 삭제하시겠습니까?`)) return;
    await deleteDoc(doc(db, "portalHeroes", h.id));
    setHeroes((prev) => prev.filter((x) => x.id !== h.id));
  };

  const handleToggleActive = async (h: PortalHero) => {
    await updateDoc(doc(db, "portalHeroes", h.id), { isActive: !h.isActive });
    setHeroes((prev) => prev.map((x) => x.id === h.id ? { ...x, isActive: !h.isActive } : x));
  };

  const moveOrder = async (h: PortalHero, direction: -1 | 1) => {
    const sorted = [...heroes].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === h.id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const target = sorted[targetIdx];
    await Promise.all([
      updateDoc(doc(db, "portalHeroes", h.id), { order: target.order }),
      updateDoc(doc(db, "portalHeroes", target.id), { order: h.order }),
    ]);
    await loadHeroes();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
          포탈 메인 상단에 노출되는 배너입니다. 여러 개 등록 시 자동 슬라이드됩니다.
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>add</span>
          배너 추가
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>불러오는 중...</div>
      ) : heroes.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>wallpaper</span>
          <p style={{ color: "#64748b", marginBottom: "0.375rem" }}>등록된 배너가 없습니다.</p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>첫 배너를 추가하여 포탈 메인 상단을 꾸며보세요.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {[...heroes].sort((a, b) => a.order - b.order).map((h, idx, arr) => (
            <div key={h.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", opacity: h.isActive ? 1 : 0.55 }}>
              <div style={{ height: "160px", background: `url(${h.imageUrl}) center/cover, #f1f5f9`, position: "relative" }}>
                <div style={{ position: "absolute", top: "0.625rem", left: "0.625rem", display: "flex", gap: "0.375rem" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "10px", background: h.isActive ? "#dcfce7" : "#f1f5f9", color: h.isActive ? "#16a34a" : "#64748b", fontSize: "0.7rem", fontWeight: 700 }}>
                    {h.isActive ? "활성" : "비활성"}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: "10px", background: "rgba(15,23,42,0.75)", color: "white", fontSize: "0.7rem", fontWeight: 600 }}>#{h.order}</span>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem", background: "linear-gradient(transparent, rgba(15,23,42,0.85))", color: "white" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>{h.title}</p>
                  {h.subtitle && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", opacity: 0.85 }}>{h.subtitle}</p>}
                </div>
              </div>
              <div style={{ padding: "0.75rem", display: "flex", gap: "0.375rem", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => moveOrder(h, -1)} disabled={idx === 0} style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: idx === 0 ? "not-allowed" : "pointer", color: "#64748b", opacity: idx === 0 ? 0.3 : 1 }} title="위로">
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>keyboard_arrow_up</span>
                  </button>
                  <button onClick={() => moveOrder(h, 1)} disabled={idx === arr.length - 1} style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: idx === arr.length - 1 ? "not-allowed" : "pointer", color: "#64748b", opacity: idx === arr.length - 1 ? 0.3 : 1 }} title="아래로">
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>keyboard_arrow_down</span>
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => handleToggleActive(h)} style={{ padding: "0.375rem 0.625rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#475569", fontSize: "0.8rem" }}>
                    {h.isActive ? "숨기기" : "활성화"}
                  </button>
                  <button onClick={() => openEdit(h)} style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#64748b" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(h)} style={{ padding: "6px", background: "white", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#dc2626" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.75rem 2rem", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>{editing ? "배너 수정" : "배너 추가"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>제목 *</label>
              <input type="text" className="form-input" placeholder="예: 2026 전교인 수양회" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>부제목</label>
              <input type="text" className="form-input" placeholder="예: 3월 15일 · 양평 수양관" value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>이미지 URL *</label>
              <input type="text" className="form-input" placeholder="https://... (풀사이즈 1920x900 권장)" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
              {form.imageUrl && (
                <div style={{ marginTop: "0.5rem", height: "140px", background: `url(${form.imageUrl}) center/cover, #f1f5f9`, borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              )}
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem" }}>
                TIP: Firebase Storage, Imgur, Cloudinary 등 CDN URL을 붙여 넣으세요.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>링크 URL</label>
                <input type="text" className="form-input" placeholder="/notices 또는 https://..." value={form.linkUrl} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>버튼 라벨</label>
                <input type="text" className="form-input" placeholder="자세히 보기" value={form.ctaLabel} onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "1rem", marginBottom: "1.5rem", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>정렬 순서</label>
                <input type="number" className="form-input" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", paddingBottom: "0.625rem" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>포탈 메인에 노출</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "0.625rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}>취소</button>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: "0.625rem 1.5rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 포스트 관리
// ────────────────────────────────────────────────────────────────────────────

function PostsPanel() {
  const [posts, setPosts] = useState<PortalPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PortalPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<"all" | PortalPost["type"]>("all");
  const [form, setForm] = useState<{ title: string; content: string; type: PortalPost["type"]; imageUrl: string; linkUrl: string; isPinned: boolean; isFeatured: boolean }>({
    title: "", content: "", type: "notice", imageUrl: "", linkUrl: "", isPinned: false, isFeatured: false,
  });

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    const snap = await getDocs(query(collection(db, "portalPosts"), orderBy("createdAt", "desc")));
    setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortalPost)));
    setIsLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", content: "", type: "notice", imageUrl: "", linkUrl: "", isPinned: false, isFeatured: false });
    setShowModal(true);
  };

  const openEdit = (post: PortalPost) => {
    setEditing(post);
    setForm({ title: post.title, content: post.content, type: post.type, imageUrl: post.imageUrl || "", linkUrl: post.linkUrl || "", isPinned: post.isPinned, isFeatured: !!post.isFeatured });
    setShowModal(true);
  };

  const handleSave = async (isPublished: boolean) => {
    if (!form.title.trim() || !form.content.trim()) { alert("제목과 내용을 입력하세요."); return; }
    setIsSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        imageUrl: form.imageUrl.trim() || null,
        linkUrl: form.linkUrl.trim() || null,
        isPinned: form.isPinned,
        isFeatured: form.isFeatured,
        isPublished,
        updatedAt: new Date().toISOString(),
      };
      if (editing) {
        await updateDoc(doc(db, "portalPosts", editing.id), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "portalPosts"), { ...payload, createdAt: new Date().toISOString(), createdAtTs: serverTimestamp() });
      }
      setShowModal(false);
      await loadPosts();
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 게시물을 삭제하시겠습니까?`)) return;
    await deleteDoc(doc(db, "portalPosts", id));
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleTogglePin = async (p: PortalPost) => {
    await updateDoc(doc(db, "portalPosts", p.id), { isPinned: !p.isPinned });
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, isPinned: !p.isPinned } : x));
  };

  const handleToggleFeatured = async (p: PortalPost) => {
    await updateDoc(doc(db, "portalPosts", p.id), { isFeatured: !p.isFeatured });
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, isFeatured: !p.isFeatured } : x));
  };

  const filtered = filterType === "all" ? posts : posts.filter((p) => p.type === filterType);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {(["all", "notice", "news", "event", "sermon"] as const).map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
                    style={{ padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid",
                             borderColor: filterType === t ? "#0f172a" : "#e2e8f0",
                             background: filterType === t ? "#0f172a" : "white",
                             color: filterType === t ? "white" : "#475569",
                             cursor: "pointer", fontSize: "0.82rem", fontWeight: filterType === t ? 700 : 500 }}>
              {t === "all" ? `전체 (${posts.length})` : portalPostTypeLabels[t]}
            </button>
          ))}
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>add</span>
          게시물 작성
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>newspaper</span>
          <p style={{ color: "#64748b" }}>작성된 게시물이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {filtered.map((post) => (
            <div key={post.id} style={{ background: "white", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "center" }}>
              {post.imageUrl && (
                <div style={{ width: "72px", height: "72px", flexShrink: 0, borderRadius: "8px", background: `url(${post.imageUrl}) center/cover, #f1f5f9` }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
                  {post.isPinned && <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: "1rem" }}>push_pin</span>}
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: portalPostTypeColors[post.type].bg, color: portalPostTypeColors[post.type].text, fontWeight: 700 }}>
                    {portalPostTypeLabels[post.type]}
                  </span>
                  {post.isFeatured && (
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", fontWeight: 700 }}>FEATURED</span>
                  )}
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: post.isPublished ? "#dcfce7" : "#f1f5f9", color: post.isPublished ? "#16a34a" : "#64748b" }}>
                    {post.isPublished ? "게시중" : "임시저장"}
                  </span>
                </div>
                <p style={{ fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</p>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</p>
              </div>
              <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                <button onClick={() => handleTogglePin(post)} title={post.isPinned ? "고정 해제" : "상단 고정"}
                        style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: post.isPinned ? "#f59e0b" : "#94a3b8" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>push_pin</span>
                </button>
                <button onClick={() => handleToggleFeatured(post)} title={post.isFeatured ? "Featured 해제" : "Featured 지정"}
                        style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: post.isFeatured ? "#d97706" : "#94a3b8" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>{post.isFeatured ? "star" : "star_outline"}</span>
                </button>
                <button onClick={() => openEdit(post)} style={{ padding: "6px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", color: "#64748b" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>edit</span>
                </button>
                <button onClick={() => handleDelete(post.id, post.title)} style={{ padding: "6px", background: "white", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#dc2626" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.75rem 2rem", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>{editing ? "게시물 수정" : "게시물 작성"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>제목 *</label>
              <input type="text" className="form-input" placeholder="게시물 제목" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>유형</label>
                <select className="form-select" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as PortalPost["type"] }))}>
                  <option value="notice">공지</option>
                  <option value="news">뉴스</option>
                  <option value="event">행사</option>
                  <option value="sermon">말씀</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>링크 URL</label>
                <input type="text" className="form-input" placeholder="/notices 또는 https://..." value={form.linkUrl} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>썸네일 이미지 URL</label>
              <input type="text" className="form-input" placeholder="https://... (선택)" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
              {form.imageUrl && (
                <div style={{ marginTop: "0.5rem", height: "120px", background: `url(${form.imageUrl}) center/cover, #f1f5f9`, borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              )}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.375rem" }}>내용 *</label>
              <textarea className="form-textarea" rows={6} placeholder="내용을 입력하세요..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} style={{ resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", padding: "0.875rem 1rem", background: "#f8fafc", borderRadius: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))} />
                <span style={{ fontWeight: 600 }}>상단 고정</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} />
                <span style={{ fontWeight: 600 }}>Featured (메인 주목 카드)</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "0.625rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}>취소</button>
              <button onClick={() => handleSave(false)} disabled={isSaving} style={{ padding: "0.625rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600, color: "#64748b" }}>임시저장</button>
              <button onClick={() => handleSave(true)} disabled={isSaving} style={{ padding: "0.625rem 1.5rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
                {isSaving ? "저장 중..." : "게시"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalPosts;
