import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Announcement, AnnouncementCategory, categoryLabels, categoryColors } from "../../types/announcement";
import { logActivity } from "../../utils/auditLog";
import { useLocale } from "../../i18n/LocaleContext";

function Announcements() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const categoryLabel = (cat: AnnouncementCategory): string => {
    const key = `announcement.category.${cat}`;
    const translated = t(key as any);
    return translated === key ? categoryLabels[cat] : translated;
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t("ann.list.deleteConfirm", { title }))) return;
    await deleteDoc(doc(db, "announcements", id));
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await logActivity(
      "ANNOUNCEMENT",
      t("ann.audit.deleteTitle"),
      t("ann.audit.deleteBody", { title }),
    );
  };

  type StatusKey = "draft" | "ended" | "scheduled" | "published";
  const getStatusInfo = (a: Announcement): { key: StatusKey; label: string; color: string; bg: string } => {
    const today = new Date().toISOString().split("T")[0];
    if (a.status === "draft") return { key: "draft", label: t("ann.status.draft"), color: "#64748b", bg: "#f1f5f9" };
    if (a.endDate && a.endDate < today) return { key: "ended", label: t("ann.status.ended"), color: "#9ca3af", bg: "#f1f5f9" };
    if (a.startDate > today) return { key: "scheduled", label: t("ann.status.scheduled"), color: "#d97706", bg: "#fef3c7" };
    return { key: "published", label: t("ann.status.published"), color: "#16a34a", bg: "#dcfce7" };
  };

  const filtered = announcements.filter((a) => {
    const info = getStatusInfo(a);
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterStatus !== "all" && info.key !== filterStatus) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-header__title">{t("ann.list.pageTitle")}</h1>
            <p className="page-header__description">{t("ann.list.pageDescription")}</p>
          </div>
          <button className="btn btn--primary" onClick={() => navigate("/announcements/new")}>
            <span className="material-symbols-outlined">add</span>
            {t("ann.list.create")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select className="form-select" style={{ width: "auto" }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">{t("ann.list.filterAllCategory")}</option>
          {(Object.keys(categoryLabels) as AnnouncementCategory[]).map((k) => (
            <option key={k} value={k}>{categoryLabel(k)}</option>
          ))}
        </select>
        <select className="form-select" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">{t("ann.list.filterAllStatus")}</option>
          <option value="published">{t("ann.status.published")}</option>
          <option value="draft">{t("ann.status.draft")}</option>
          <option value="ended">{t("ann.status.ended")}</option>
          <option value="scheduled">{t("ann.status.scheduled")}</option>
        </select>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", alignSelf: "center" }}>{t("ann.list.countUnit", { n: filtered.length })}</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>{t("ann.list.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="form-card" style={{ textAlign: "center", padding: "3rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem", color: "#cbd5e1" }}>campaign</span>
          <p style={{ color: "var(--text-secondary)" }}>{t("ann.list.empty")}</p>
          <button className="btn btn--primary" onClick={() => navigate("/announcements/new")} style={{ marginTop: "1rem" }}>{t("ann.list.firstCreate")}</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((a) => {
            const status = getStatusInfo(a);
            const catColor = categoryColors[a.category];
            return (
              <div key={a.id} className="form-card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                {a.isPinned && (
                  <div style={{ flexShrink: 0, color: "#d97706" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>push_pin</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: catColor.bg, color: catColor.text, fontWeight: 600 }}>
                      {categoryLabel(a.category)}
                    </span>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{a.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span>{a.startDate}{a.endDate ? ` ~ ${a.endDate}` : ""}</span>
                    {a.attachments.length > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>attach_file</span>
                        {t("ann.list.attachCount", { n: a.attachments.length })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  <button onClick={() => navigate(`/announcements/edit/${a.id}`)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "var(--text-secondary)" }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(a.id, a.title)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "var(--danger)" }}>delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Announcements;
