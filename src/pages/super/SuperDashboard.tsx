import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";
import { useAuth } from "../../App";
import { subscribeAllStatusRequests } from "../../utils/statusRequests";
import {
  ChurchStatusRequest,
  StatusRequestAction,
  STATUS_REQUEST_ACTION_LABEL,
} from "../../types/statusRequest";

function SuperDashboard() {
  const { auth } = useAuth();
  const user = auth.type === "super" ? auth : null;

  const [churches, setChurches] = useState<Church[]>([]);
  const [admins, setAdmins] = useState<number>(0);
  const [inquiries, setInquiries] = useState<ChurchStatusRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  // 문의 요청은 실시간 구독 — 처리 즉시 대시보드 지표가 갱신되도록 함
  useEffect(() => {
    const unsub = subscribeAllStatusRequests(setInquiries);
    return unsub;
  }, []);

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

  const pendingInquiries = inquiries.filter((r) => r.status === "pending");
  const processedInquiries = inquiries.filter((r) => r.status !== "pending");
  const actionCounts: Record<StatusRequestAction, number> = {
    activate: 0, hold: 0, suspend: 0, delete: 0, none: 0,
  };
  processedInquiries.forEach((r) => {
    if (r.resolvedAction) actionCounts[r.resolvedAction] += 1;
  });

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
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          안녕하세요, {user?.displayName?.split(" ")[0] || "슈퍼유저"}님
          {user && (
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px",
              background: user.isPrimary ? "#dbeafe" : "#f1f5f9",
              color: user.isPrimary ? "#1d4ed8" : "#475569",
              border: `1px solid ${user.isPrimary ? "#bfdbfe" : "#cbd5e1"}`,
            }}>
              {user.isPrimary ? "주 슈퍼유저" : "슈퍼유저 대리"}
            </span>
          )}
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

      {/* 문의 요청 현황 */}
      <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.125rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ color: "#16649c" }}>contact_support</span>
            문의 요청 현황
          </h3>
          <Link to="/admin/super/status-requests" style={{ fontSize: "0.8rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
            전체 관리 →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.875rem", marginBottom: "1rem" }}>
          <Link to="/admin/super/status-requests" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: "12px", padding: "1rem 1.125rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b45309", letterSpacing: "0.02em" }}>새 문의 (검토 대기)</span>
                <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#b45309" }}>pending</span>
              </div>
              <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#92400e", letterSpacing: "-0.02em" }}>{pendingInquiries.length}</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#b45309" }}>처리가 필요한 요청</p>
            </div>
          </Link>
          <Link to="/admin/super/status-requests" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: "12px", padding: "1rem 1.125rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#15803d", letterSpacing: "0.02em" }}>처리된 문의</span>
                <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#15803d" }}>task_alt</span>
              </div>
              <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#166534", letterSpacing: "-0.02em" }}>{processedInquiries.length}</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#15803d" }}>처리 완료 + 종결 합계</p>
            </div>
          </Link>
        </div>

        {processedInquiries.length > 0 && (
          <>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#475569", letterSpacing: "0.03em", textTransform: "uppercase" }}>처리 결과 분류</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem" }}>
              {(Object.keys(actionCounts) as StatusRequestAction[]).map((a) => {
                const count = actionCounts[a];
                const tone = actionTone(a);
                return (
                  <div key={a} style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: "10px", padding: "0.625rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: count === 0 ? 0.55 : 1 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "0.72rem", color: tone.color, fontWeight: 700 }}>{actionShortLabel(a)}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.68rem", color: "#64748b" }}>{STATUS_REQUEST_ACTION_LABEL[a]}</p>
                    </div>
                    <span style={{ fontSize: "1.125rem", fontWeight: 800, color: tone.color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {inquiries.length === 0 && !isLoading && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", padding: "0.5rem 0" }}>
            아직 접수된 문의가 없습니다.
          </p>
        )}
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

function actionTone(a: StatusRequestAction): { bg: string; color: string; border: string } {
  switch (a) {
    case "activate": return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    case "hold": return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    case "suspend": return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "delete": return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
    case "none":
    default: return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  }
}

function actionShortLabel(a: StatusRequestAction): string {
  switch (a) {
    case "activate": return "정상화";
    case "hold": return "보류";
    case "suspend": return "정지";
    case "delete": return "삭제";
    case "none": return "종결";
  }
}

export default SuperDashboard;
