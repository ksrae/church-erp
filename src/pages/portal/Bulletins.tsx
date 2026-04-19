import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { WorshipInstance, worshipTypeLabels, worshipTypeColors } from "../../types/worship";
import { useMyChurchId } from "../../components/RequireMyChurch";

function Bulletins() {
  const myChurchId = useMyChurchId();
  const [worships, setWorships] = useState<WorshipInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { if (myChurchId) loadData(); }, [myChurchId]);

  const loadData = async () => {
    if (!myChurchId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "worshipInstances"),
        where("churchId", "==", myChurchId),
        where("isPublished", "==", true),
        orderBy("date", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setWorships(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipInstance)));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const filtered = worships.filter((w) => filterType === "all" || w.type === filterType);

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>WORSHIP</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>주보 · 말씀</h1>
        <p style={{ color: "#64748b" }}>예배 주보와 순서를 확인하세요.</p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "sunday", "wednesday", "special", "other"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: "0.375rem 0.875rem", borderRadius: "20px", border: "1px solid",
              borderColor: filterType === t ? "#16649c" : "#e2e8f0",
              background: filterType === t ? "#16649c" : "white",
              color: filterType === t ? "white" : "#475569",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: filterType === t ? 600 : 400,
            }}
          >
            {t === "all" ? "전체" : worshipTypeLabels[t as WorshipInstance["type"]]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>menu_book</span>
          <p>등록된 주보가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((w) => (
            <div key={w.id} style={{ background: "white", borderRadius: "1rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div
                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                style={{ padding: "1.25rem", cursor: "pointer", display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <div style={{ width: "4px", height: "3rem", borderRadius: "4px", background: worshipTypeColors[w.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: `${worshipTypeColors[w.type]}22`, color: worshipTypeColors[w.type], fontWeight: 600 }}>
                      {worshipTypeLabels[w.type]}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{w.date}</span>
                  </div>
                  <p style={{ fontWeight: 600, color: "#1e293b" }}>{w.title || worshipTypeLabels[w.type]}</p>
                  {w.preacher && <p style={{ fontSize: "0.875rem", color: "#64748b" }}>설교 {w.preacher}</p>}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                  {w.bulletinFileUrl && (
                    <a
                      href={w.bulletinFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "#16649c", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>download</span>
                      주보
                    </a>
                  )}
                  <span className="material-symbols-outlined" style={{ color: "#94a3b8" }}>
                    {expandedId === w.id ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </div>

              {expandedId === w.id && w.order.length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "1rem 1.25rem" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b", marginBottom: "0.75rem" }}>예배 순서</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5rem 1fr auto", gap: "0.375rem 0.75rem", alignItems: "start" }}>
                    {w.order.map((item) => (
                      <>
                        <span key={`${item.id}-seq`} style={{ fontSize: "0.8rem", color: "#94a3b8", paddingTop: "2px" }}>{item.seq}</span>
                        <span key={`${item.id}-name`} style={{ fontSize: "0.9rem", color: "#1e293b" }}>{item.name}</span>
                        <span key={`${item.id}-assignee`} style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{item.assignee || ""}</span>
                      </>
                    ))}
                  </div>
                  {w.scripture && (
                    <div style={{ marginTop: "0.75rem", padding: "0.625rem", background: "#f8fafc", borderRadius: "6px", fontSize: "0.875rem", color: "#475569" }}>
                      <strong>성경 본문:</strong> {w.scripture}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Bulletins;
