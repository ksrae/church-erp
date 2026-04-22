import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Announcement, categoryColors, AnnouncementCategory } from "../../types/announcement";
import { useMyChurchId } from "../../components/RequireMyChurch";
import { Church } from "../../types/church";
import { useLocale } from "../../i18n/LocaleContext";

function Notices() {
  const { t } = useLocale();
  const myChurchId = useMyChurchId();
  const [church, setChurch] = useState<Church | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!myChurchId) return;
    loadData();
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => setSelectedId(id), 300);
    }
  }, [myChurchId]);

  const loadData = async () => {
    if (!myChurchId) return;
    setIsLoading(true);
    try {
      const chSnap = await getDoc(doc(db, "churches", myChurchId));
      const ch = chSnap.exists() ? ({ id: chSnap.id, ...chSnap.data() } as Church) : null;
      setChurch(ch);

      if (ch && ch.showAnnouncements === false) {
        setAnnouncements([]);
        setIsLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const q = query(
        collection(db, "announcements"),
        where("churchId", "==", myChurchId),
        where("status", "==", "published"),
        orderBy("isPinned", "desc"),
        orderBy("startDate", "desc")
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)).filter((a) => a.startDate <= today && (!a.endDate || a.endDate >= today));
      setAnnouncements(all);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const filtered = announcements.filter((a) => filterCategory === "all" || a.category === filterCategory);
  const selected = selectedId ? announcements.find((a) => a.id === selectedId) : null;

  const categories: (AnnouncementCategory | "all")[] = ["all", "notice", "education", "event", "pastoral", "other"];

  if (church && church.showAnnouncements === false) {
    return (
      <div className="portal-page-container">
        <div style={{ padding: "3rem", textAlign: "center", background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#64748b" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: "#cbd5e1" }}>notifications_off</span>
          <p style={{ marginTop: "0.75rem", fontSize: "0.95rem" }}>{t("portal.notices.hiddenByChurch")}</p>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="portal-page-container">
        <button
          onClick={() => setSelectedId(null)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#64748b", marginBottom: "1.5rem", fontSize: "0.9rem" }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t("portal.notices.backToList")}
        </button>

        <article style={{ background: "white", borderRadius: "1rem", padding: "1.5rem 2rem", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {selected.isPinned && <span className="material-symbols-outlined" style={{ color: "#d97706" }}>push_pin</span>}
            <span style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "12px", background: categoryColors[selected.category].bg, color: categoryColors[selected.category].text, fontWeight: 600 }}>
              {t(`announcement.category.${selected.category}` as const)}
            </span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "1rem" }}>{selected.title}</h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
            {selected.startDate}{selected.endDate ? ` ~ ${selected.endDate}` : ""}
          </p>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
            <p style={{ lineHeight: 1.8, color: "#334155", whiteSpace: "pre-wrap" }}>{selected.content}</p>
          </div>
          {selected.attachments.length > 0 && (
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem", marginTop: "1.5rem" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "#64748b" }}>{t("portal.notices.attachments")}</h3>
              {selected.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "#f8fafc", borderRadius: "8px", textDecoration: "none", color: "#16649c", marginBottom: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>download</span>
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>{t("portal.notices.overline")}</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>{t("portal.notices.title")}</h1>
        <p style={{ color: "#64748b" }}>{t("portal.notices.subtitle")}</p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            style={{
              padding: "0.375rem 0.875rem", borderRadius: "20px", border: "1px solid",
              borderColor: filterCategory === c ? "#16649c" : "#e2e8f0",
              background: filterCategory === c ? "#16649c" : "white",
              color: filterCategory === c ? "white" : "#475569",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: filterCategory === c ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {c === "all" ? t("portal.notices.filterAll") : t(`announcement.category.${c as AnnouncementCategory}` as const)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>{t("portal.notices.loading")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>campaign</span>
          <p>{t("portal.notices.empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.map((a) => (
            <div
              key={a.id}
              id={a.id}
              onClick={() => setSelectedId(a.id)}
              style={{ background: "white", borderRadius: "1rem", padding: "1.25rem 1.5rem", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", gap: "1rem", alignItems: "flex-start", transition: "box-shadow 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
            >
              {a.isPinned && <span className="material-symbols-outlined" style={{ color: "#d97706", marginTop: "2px", flexShrink: 0 }}>push_pin</span>}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: categoryColors[a.category].bg, color: categoryColors[a.category].text, fontWeight: 600 }}>
                    {t(`announcement.category.${a.category}` as const)}
                  </span>
                </div>
                <p style={{ fontWeight: a.isPinned ? 700 : 600, color: "#1e293b", marginBottom: "0.25rem" }}>{a.title}</p>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{a.startDate}</p>
              </div>
              {a.attachments.length > 0 && (
                <span className="material-symbols-outlined" style={{ color: "#94a3b8", flexShrink: 0 }}>attach_file</span>
              )}
              <span className="material-symbols-outlined" style={{ color: "#cbd5e1", flexShrink: 0 }}>chevron_right</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notices;
