import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";
import { useAuth } from "../../App";

function SuperDashboard() {
  const { auth } = useAuth();
  const user = auth.type === "super" ? auth : null;

  const [churches, setChurches] = useState<Church[]>([]);
  const [admins, setAdmins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [churchSnap, adminSnap] = await Promise.all([
        getDocs(query(collection(db, "churches"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "churchAdmins")).catch(() => ({ docs: [] as any[] })),
      ]);
      setChurches(churchSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
      setAdmins(adminSnap.docs.length);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const activeChurches = churches.filter((c) => c.isActive).length;

  const stats = [
    { label: "전체 교회", value: churches.length, sub: `활성 ${activeChurches}`, icon: "business", color: "#3b82f6", to: "/admin/super/churches" },
    { label: "교회 관리자", value: admins, sub: "등록된 계정", icon: "group", color: "#10b981", to: "/admin/super/churches" },
    { label: "로고 등록", value: churches.filter((c) => !!c.logo).length, sub: "교회 브랜딩", icon: "image", color: "#f59e0b", to: "/admin/super/churches" },
    { label: "비활성 교회", value: churches.length - activeChurches, sub: "관리 필요", icon: "block", color: "#7c3aed", to: "/admin/super/churches" },
  ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: "1.75rem" }}>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, fontWeight: 500 }}>
          {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.02em" }}>
          안녕하세요, {user?.displayName?.split(" ")[0] || "슈퍼유저"}님
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.375rem", fontSize: "0.95rem" }}>
          등록된 교회와 라이선스를 관리합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((s) => (
          <Link key={s.label} to={s.to}
                style={{ background: "white", borderRadius: "14px", padding: "1.25rem", border: "1px solid #e2e8f0", textDecoration: "none", transition: "all 0.15s", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: s.color, fontSize: "1.375rem" }}>{s.icon}</span>
              </div>
              <span className="material-symbols-outlined" style={{ color: "#cbd5e1", fontSize: "1.125rem" }}>chevron_right</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.25rem", fontWeight: 500 }}>{s.label}</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{s.value}</p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>{s.sub}</p>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {/* 빠른 작업 */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontWeight: 800, fontSize: "1rem", margin: "0 0 1rem", color: "#0f172a" }}>빠른 작업</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { to: "/admin/super/churches", icon: "add_business", label: "새 교회 추가 & 라이선스 발급", color: "#3b82f6" },
              { to: "/", icon: "open_in_new", label: "포탈 메인 보기", color: "#7c3aed" },
            ].map((a) => (
              <Link key={a.label} to={a.to}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.875rem", borderRadius: "10px", textDecoration: "none", color: "inherit", border: "1px solid #e2e8f0", transition: "all 0.15s" }}>
                <span className="material-symbols-outlined" style={{ color: a.color, fontSize: "1.25rem" }}>{a.icon}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a", flex: 1 }}>{a.label}</span>
                <span className="material-symbols-outlined" style={{ color: "#cbd5e1", fontSize: "1rem" }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 최근 등록된 교회 */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1rem", margin: 0, color: "#0f172a" }}>최근 등록된 교회</h3>
            <Link to="/admin/super/churches" style={{ fontSize: "0.8rem", color: "#64748b", textDecoration: "none" }}>전체 →</Link>
          </div>
          {isLoading ? (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>불러오는 중...</p>
          ) : churches.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>등록된 교회가 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {churches.slice(0, 8).map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", borderRadius: "8px", background: "#f8fafc" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {c.logo ? <img src={c.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.125rem" }}>church</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                      {c.pastorName ? `담임 ${c.pastorName}` : "담임목사 미등록"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: c.isActive ? "#dcfce7" : "#f1f5f9", color: c.isActive ? "#16a34a" : "#64748b", fontWeight: 600 }}>
                    {c.isActive ? "활성" : "비활성"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperDashboard;
