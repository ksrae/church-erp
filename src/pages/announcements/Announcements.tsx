import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Announcement, categoryLabels, categoryColors } from "../../types/announcement";
import { logActivity } from "../../utils/auditLog";

function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
    if (!confirm(`"${title}" 공지를 삭제하시겠습니까?`)) return;
    await deleteDoc(doc(db, "announcements", id));
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await logActivity("ANNOUNCEMENT", "공지 삭제", `"${title}" 공지가 삭제되었습니다.`);
  };

  const getStatusLabel = (a: Announcement) => {
    const today = new Date().toISOString().split("T")[0];
    if (a.status === "draft") return { label: "임시저장", color: "#64748b", bg: "#f1f5f9" };
    if (a.endDate && a.endDate < today) return { label: "게시종료", color: "#9ca3af", bg: "#f1f5f9" };
    if (a.startDate > today) return { label: "예약", color: "#d97706", bg: "#fef3c7" };
    return { label: "게시중", color: "#16a34a", bg: "#dcfce7" };
  };

  const filtered = announcements.filter((a) => {
    const statusInfo = getStatusLabel(a);
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterStatus !== "all" && statusInfo.label !== filterStatus) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-header__title">공지/소식 관리</h1>
            <p className="page-header__description">성도 포탈에 표시할 공지사항과 소식을 관리합니다.</p>
          </div>
          <button className="btn btn--primary" onClick={() => navigate("/announcements/new")}>
            <span className="material-symbols-outlined">add</span>
            공지 작성
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select className="form-select" style={{ width: "auto" }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">전체 카테고리</option>
          <option value="notice">공지</option>
          <option value="education">교육</option>
          <option value="event">행사</option>
          <option value="pastoral">목양편지</option>
          <option value="other">기타</option>
        </select>
        <select className="form-select" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">전체 상태</option>
          <option value="게시중">게시중</option>
          <option value="임시저장">임시저장</option>
          <option value="게시종료">게시종료</option>
          <option value="예약">예약</option>
        </select>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", alignSelf: "center" }}>{filtered.length}개</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="form-card" style={{ textAlign: "center", padding: "3rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem", color: "#cbd5e1" }}>campaign</span>
          <p style={{ color: "var(--text-secondary)" }}>공지사항이 없습니다.</p>
          <button className="btn btn--primary" onClick={() => navigate("/announcements/new")} style={{ marginTop: "1rem" }}>첫 공지 작성하기</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((a) => {
            const status = getStatusLabel(a);
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
                      {categoryLabels[a.category]}
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
                        {a.attachments.length}개
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
