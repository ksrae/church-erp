import { useEffect, useState } from "react";
import {
  ChurchChangeRequest,
  CHURCH_INFO_FIELD_LABEL,
} from "../../types/changeRequest";
import {
  subscribePendingRequests,
  listAllRequests,
  approveRequest,
  rejectRequest,
  markEmailSent,
} from "../../utils/changeRequests";
import { useAuth } from "../../App";

function ChangeRequestsPage() {
  const { auth } = useAuth();
  const superEmail = auth.type === "super" ? auth.email : "";

  const [view, setView] = useState<"pending" | "all">("pending");
  const [requests, setRequests] = useState<ChurchChangeRequest[]>([]);
  const [selected, setSelected] = useState<ChurchChangeRequest | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (view === "pending") {
      const unsub = subscribePendingRequests(setRequests);
      return unsub;
    }
    // 전체 조회는 1회 fetch
    listAllRequests().then(setRequests).catch(() => setRequests([]));
  }, [view]);

  const refreshAll = async () => {
    if (view === "all") {
      const rows = await listAllRequests();
      setRequests(rows);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    if (!confirm(`이 요청을 승인하면 교회 정보가 즉시 업데이트됩니다.\n계속하시겠습니까?`)) return;
    setWorking(true);
    try {
      await approveRequest(selected.id, { email: superEmail }, note.trim() || undefined);
      setMsg("요청이 승인되어 교회 정보가 업데이트되었습니다. 이메일 통지 버튼으로 관리자에게 알려주세요.");
      setSelected(null);
      setNote("");
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!note.trim()) { alert("반려 사유를 입력해주세요."); return; }
    if (!confirm("정말 이 요청을 반려하시겠습니까?")) return;
    setWorking(true);
    try {
      await rejectRequest(selected.id, { email: superEmail }, note.trim());
      setMsg("요청이 반려되었습니다.");
      setSelected(null);
      setNote("");
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  };

  const buildMailto = (req: ChurchChangeRequest) => {
    const subject = encodeURIComponent(`[교회 포탈] ${req.churchName} 정보 수정 요청 ${req.status === "approved" ? "반영 완료" : "반려 안내"}`);
    const itemLines = req.items.map((i) => `  • ${CHURCH_INFO_FIELD_LABEL[i.field]}: ${i.currentValue || "(없음)"} → ${i.requestedValue}`).join("\n");
    const resultLine = req.status === "approved"
      ? "요청하신 내용이 반영되었습니다."
      : `아쉽게도 이번 요청은 반려되었습니다.\n\n사유: ${req.resolverNote || "-"}`;
    const body = encodeURIComponent(
      `${req.requesterName}님,\n\n` +
      `${req.churchName} 교회의 정보 수정 요청을 검토하였습니다.\n\n` +
      `[요청 내용]\n${itemLines}\n\n` +
      `${resultLine}\n\n` +
      `감사합니다.\n— 시스템 관리자 (${superEmail})\n`
    );
    return `mailto:${req.requesterEmail}?subject=${subject}&body=${body}`;
  };

  const statusBadge = (s: ChurchChangeRequest["status"]) => {
    if (s === "pending") return { text: "검토 대기", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
    if (s === "approved") return { text: "반영 완료", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
    return { text: "반려됨", bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined">rate_review</span>
            교회 정보 수정 요청
          </h1>
          <p style={{ margin: "0.375rem 0 0", fontSize: "0.88rem", color: "#64748b" }}>
            각 교회 관리자가 제출한 변경 요청을 검토하고 승인/반려합니다. 승인 시 교회 문서가 즉시 업데이트됩니다.
          </p>
        </div>
        <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "10px", padding: "3px" }}>
          {(["pending", "all"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "0.45rem 0.9rem", border: "none", borderRadius: "8px",
                background: view === v ? "white" : "transparent",
                color: view === v ? "#0f172a" : "#64748b",
                fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {v === "pending" ? "대기 중" : "전체"}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#065f46", fontSize: "0.88rem" }}>
          {msg}
        </div>
      )}

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {requests.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            {view === "pending" ? "대기 중인 요청이 없습니다." : "요청 내역이 없습니다."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={th}>상태</th>
                <th style={th}>교회</th>
                <th style={th}>요청자</th>
                <th style={th}>변경 항목</th>
                <th style={th}>요청 일시</th>
                <th style={{ ...th, textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const b = statusBadge(r.status);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>
                        {b.text}
                      </span>
                    </td>
                    <td style={td}>{r.churchName}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.requesterName}</div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{r.requesterEmail}</div>
                    </td>
                    <td style={td}>
                      {r.items.map((i) => CHURCH_INFO_FIELD_LABEL[i.field]).join(", ")}
                    </td>
                    <td style={td}>{new Date(r.createdAt).toLocaleString("ko-KR")}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => { setSelected(r); setNote(""); setMsg(""); }}
                        style={{ padding: "0.375rem 0.75rem", border: "1px solid #16649c", background: "white", color: "#16649c", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div
          onClick={() => !working && setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "14px", width: "100%", maxWidth: "640px", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ color: "#16649c" }}>rate_review</span>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>요청 상세</h3>
              <button onClick={() => !working && setSelected(null)} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                <div><strong>교회:</strong> {selected.churchName}</div>
                <div><strong>요청자:</strong> {selected.requesterName}</div>
                <div><strong>이메일:</strong> {selected.requesterEmail}</div>
                <div><strong>요청:</strong> {new Date(selected.createdAt).toLocaleString("ko-KR")}</div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>변경 요청 항목</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {selected.items.map((item, i) => (
                    <div key={i} style={{ padding: "0.625rem 0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>{CHURCH_INFO_FIELD_LABEL[item.field]}</div>
                      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        <span style={{ textDecoration: "line-through" }}>{item.currentValue || "(없음)"}</span>
                        {" → "}
                        <span style={{ color: "#16649c", fontWeight: 600 }}>{item.requestedValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 0.375rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>요청 사유</p>
                <div style={{ padding: "0.625rem 0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem", color: "#475569", whiteSpace: "pre-wrap" }}>
                  {selected.reason}
                </div>
              </div>

              {selected.status === "pending" ? (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                      관리자 메모 (승인 시 선택 / 반려 시 필수)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="관리자 처리 의견 또는 반려 사유"
                      style={{ width: "100%", padding: "0.5rem 0.625rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={() => setSelected(null)} disabled={working} style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                      닫기
                    </button>
                    <button onClick={handleReject} disabled={working} style={{ padding: "0.55rem 1rem", border: "1px solid #ef4444", background: "white", color: "#ef4444", borderRadius: "8px", cursor: working ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                      반려
                    </button>
                    <button onClick={handleApprove} disabled={working} style={{ padding: "0.55rem 1rem", border: "none", background: "#16649c", color: "white", borderRadius: "8px", cursor: working ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>check</span>
                      승인 & 교회 정보 반영
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div style={{ padding: "0.625rem 0.75rem", background: selected.status === "approved" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${selected.status === "approved" ? "#bbf7d0" : "#fecaca"}`, borderRadius: "8px", fontSize: "0.85rem" }}>
                    <div style={{ fontWeight: 700, color: selected.status === "approved" ? "#15803d" : "#b91c1c", marginBottom: "0.25rem" }}>
                      {selected.status === "approved" ? "반영됨" : "반려됨"}
                      {selected.resolvedAt && (
                        <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#64748b", marginLeft: "0.5rem" }}>
                          {new Date(selected.resolvedAt).toLocaleString("ko-KR")} · {selected.resolvedBy}
                        </span>
                      )}
                    </div>
                    {selected.resolverNote && <div style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{selected.resolverNote}</div>}
                  </div>
                  <a
                    href={buildMailto(selected)}
                    onClick={() => { markEmailSent(selected.id).catch(() => {}); }}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", padding: "0.625rem 1rem", background: "#16649c", color: "white", textDecoration: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.88rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>mail</span>
                    관리자에게 결과 이메일 전송
                    {selected.emailNotifiedAt && <span style={{ fontSize: "0.72rem", opacity: 0.85, marginLeft: "0.25rem" }}>(최근: {new Date(selected.emailNotifiedAt).toLocaleString("ko-KR")})</span>}
                  </a>
                  <button onClick={() => setSelected(null)} style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.75rem 0.875rem", textAlign: "left", fontSize: "0.76rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" };
const td: React.CSSProperties = { padding: "0.75rem 0.875rem", color: "#334155" };

export default ChangeRequestsPage;
