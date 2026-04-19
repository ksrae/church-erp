import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Church } from "../types/church";

export const MY_CHURCH_KEY = "church_portal_my_church";

export function getMyChurchId(): string | null {
  return localStorage.getItem(MY_CHURCH_KEY);
}

export function setMyChurchId(id: string): void {
  localStorage.setItem(MY_CHURCH_KEY, id);
  window.dispatchEvent(new Event("mychurch:changed"));
}

export function clearMyChurchId(): void {
  localStorage.removeItem(MY_CHURCH_KEY);
  window.dispatchEvent(new Event("mychurch:changed"));
}

export function useMyChurchId(): string | null {
  const [id, setId] = useState<string | null>(() => getMyChurchId());
  useEffect(() => {
    const handler = () => setId(getMyChurchId());
    window.addEventListener("mychurch:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("mychurch:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return id;
}

interface RequireMyChurchProps {
  children: ReactNode;
  hint?: string;
}

export function RequireMyChurch({ children, hint }: RequireMyChurchProps) {
  const myChurchId = useMyChurchId();
  if (!myChurchId) return <ChurchFinder inline hint={hint} />;
  return <>{children}</>;
}

interface ChurchFinderProps {
  inline?: boolean;
  hint?: string;
}

export function ChurchFinder({ inline, hint }: ChurchFinderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "churches"), where("isActive", "==", true)));
        setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
      } catch (e) { console.error(e); }
      setIsLoading(false);
    })();
  }, []);

  const filtered = churches.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.pastorName || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q)
    );
  });

  const handleSelect = (c: Church) => {
    setMyChurchId(c.id);
    if (!inline) navigate(location.state?.returnTo || "/");
  };

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>FIND YOUR CHURCH</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>
          {hint ? hint : "먼저 내 교회를 선택해주세요"}
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          주보·공지·일정은 선택하신 교회의 정보를 보여드립니다. 교회는 언제든 변경할 수 있습니다.
        </p>
      </div>

      {/* 검색 바 */}
      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <span className="material-symbols-outlined" style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1.25rem", pointerEvents: "none" }}>search</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="교회명, 담임목사, 주소로 검색..."
          style={{ width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", fontSize: "0.95rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", outline: "none", transition: "all 0.15s", boxSizing: "border-box" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#16649c")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem", animation: "spin 1s linear infinite" }}>autorenew</span>
          불러오는 중...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : churches.length === 0 ? (
        <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "2.5rem", textAlign: "center", border: "1px solid #fde68a" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#d97706", display: "block", marginBottom: "0.75rem" }}>business</span>
          <p style={{ color: "#92400e", fontWeight: 700, marginBottom: "0.375rem", fontSize: "1rem" }}>등록된 교회가 없습니다</p>
          <p style={{ color: "#b45309", fontSize: "0.875rem", margin: 0 }}>
            교회가 아직 이 포탈에 등록되지 않았습니다. 관리자에게 교회 등록을 요청해주세요.
          </p>
          <a href="mailto:farmyon@gmail.com" style={{ display: "inline-block", marginTop: "1rem", padding: "0.625rem 1.25rem", background: "#d97706", color: "white", textDecoration: "none", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem" }}>
            등록 문의 보내기
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>search_off</span>
          "{searchQuery}" 검색 결과가 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }}>
          {filtered.map((c) => (
            <button key={c.id} onClick={() => handleSelect(c)}
                    style={{ textAlign: "left", background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: "0.625rem" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#16649c"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(22,100,156,0.12)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.375rem" }}>church</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                  {c.pastorName && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0" }}>담임 {c.pastorName}</p>}
                </div>
              </div>
              {c.address && (
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>location_on</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</span>
                </p>
              )}
              <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", color: "#16649c", fontWeight: 600, fontSize: "0.85rem" }}>
                이 교회 선택하기
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RequireMyChurch;
