import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ChurchStatusRequest,
  StatusRequestAction,
  StatusRequestContext,
  STATUS_REQUEST_ACTION_LABEL,
  STATUS_REQUEST_CONTEXT_LABEL,
} from "../../types/statusRequest";
import { Church, ChurchStatus, getChurchStatus } from "../../types/church";
import {
  subscribePendingStatusRequests,
  subscribeAllStatusRequests,
  resolveStatusRequest,
} from "../../utils/statusRequests";
import { useAuth } from "../../App";

// 요청 맥락별 허용 액션 (유저 스펙)
//  hold       : delete / activate(처리완료) / suspend
//  suspended  : delete / activate(처리완료) / hold
//  deleted    : activate 불가(교회 문서 없음) / delete(이미 없음 — 종결) / none
const ALLOWED_ACTIONS: Record<StatusRequestContext, StatusRequestAction[]> = {
  hold: ["activate", "suspend", "delete", "none"],
  suspended: ["activate", "hold", "delete", "none"],
  deleted: ["none"],
  portal_registration: ["none"],
  portal_general: ["none"],
};

function statusBadge(s: ChurchStatusRequest["status"]) {
  if (s === "pending") return { text: "검토 대기", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
  if (s === "resolved") return { text: "처리 완료", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
  return { text: "종결(반려)", bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
}

function contextBadge(c: StatusRequestContext) {
  const map: Record<StatusRequestContext, { bg: string; color: string; border: string }> = {
    hold: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    suspended: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    deleted: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
    portal_registration: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    portal_general: { bg: "#f1f5f9", color: "#334155", border: "#e2e8f0" },
  };
  return { ...map[c], text: STATUS_REQUEST_CONTEXT_LABEL[c] };
}

function StatusRequestsPage() {
  const { auth } = useAuth();
  const superEmail = auth.type === "super" ? auth.email : "";

  const [view, setView] = useState<"pending" | "all">("pending");
  const [requests, setRequests] = useState<ChurchStatusRequest[]>([]);
  const [selected, setSelected] = useState<ChurchStatusRequest | null>(null);
  const [currentChurchStatus, setCurrentChurchStatus] = useState<ChurchStatus | "gone" | null>(null);
  const [note, setNote] = useState("");
  const [action, setAction] = useState<StatusRequestAction | "">("");
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = view === "pending"
      ? subscribePendingStatusRequests(setRequests)
      : subscribeAllStatusRequests(setRequests);
    return unsub;
  }, [view]);

  // 선택된 요청의 현재 교회 상태 확인
  useEffect(() => {
    if (!selected || !selected.churchId) {
      setCurrentChurchStatus(selected ? "gone" : null);
      return;
    }
    getDoc(doc(db, "churches", selected.churchId))
      .then((snap) => {
        if (!snap.exists()) setCurrentChurchStatus("gone");
        else setCurrentChurchStatus(getChurchStatus(snap.data() as Church));
      })
      .catch(() => setCurrentChurchStatus(null));
  }, [selected]);

  const availableActions = useMemo<StatusRequestAction[]>(() => {
    if (!selected) return [];
    // 교회 문서가 이미 없으면 상태변경 불가 — none 만
    if (currentChurchStatus === "gone") return ["none"];
    return ALLOWED_ACTIONS[selected.context];
  }, [selected, currentChurchStatus]);

  const handleResolve = async () => {
    if (!selected) return;
    if (!action) { alert("처리 액션을 선택해주세요."); return; }
    if (!note.trim()) { alert("처리 사유를 간단히 입력해주세요."); return; }

    const label = STATUS_REQUEST_ACTION_LABEL[action];
    if (!confirm(`선택한 액션: ${label}\n처리를 진행하시겠습니까?`)) return;

    setWorking(true);
    try {
      await resolveStatusRequest(selected.id, action, { email: superEmail }, note.trim());
      // 낙관적 반영 — onSnapshot 이 도착하기 전 사용자가 동일 요청을 다시 처리하지 않도록 즉시 로컬 상태에서 제거/갱신
      const resolvedId = selected.id;
      const nextStatus = action === "none" ? "rejected" : "resolved";
      setRequests((prev) => {
        if (view === "pending") {
          return prev.filter((r) => r.id !== resolvedId);
        }
        return prev.map((r) =>
          r.id === resolvedId
            ? {
                ...r,
                status: nextStatus,
                resolvedAction: action,
                resolvedAt: new Date().toISOString(),
                resolvedBy: superEmail,
                resolverNote: note.trim(),
              }
            : r
        );
      });
      setMsg(`요청이 ${label} (으)로 처리되었습니다.`);
      setSelected(null);
      setAction("");
      setNote("");
    } catch (e: any) {
      alert(e?.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined">contact_support</span>
            상태 문의 요청
          </h1>
          <p style={{ margin: "0.375rem 0 0", fontSize: "0.88rem", color: "#64748b" }}>
            보류/정지/삭제 관련 문의 요청을 검토하고 교회 상태를 조정하거나 요청을 종결합니다.
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
                <th style={th}>분류</th>
                <th style={th}>교회</th>
                <th style={th}>제목</th>
                <th style={th}>요청자</th>
                <th style={th}>요청 일시</th>
                <th style={{ ...th, textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const sb = statusBadge(r.status);
                const cb = contextBadge(r.context);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                        {sb.text}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: cb.bg, color: cb.color, border: `1px solid ${cb.border}` }}>
                        {cb.text}
                      </span>
                    </td>
                    <td style={td}>{r.churchName || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                    <td style={td}>{r.subject}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.requesterName}</div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{r.requesterEmail}</div>
                    </td>
                    <td style={td}>{new Date(r.createdAt).toLocaleString("ko-KR")}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => { setSelected(r); setNote(""); setAction(""); setMsg(""); }}
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
              <span className="material-symbols-outlined" style={{ color: "#16649c" }}>contact_support</span>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>요청 상세</h3>
              <button onClick={() => !working && setSelected(null)} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                <div><strong>교회:</strong> {selected.churchName || "—"}</div>
                <div>
                  <strong>요청 분류:</strong>{" "}
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", ...contextBadge(selected.context) }}>
                    {STATUS_REQUEST_CONTEXT_LABEL[selected.context]}
                  </span>
                </div>
                <div><strong>요청자:</strong> {selected.requesterName}</div>
                <div><strong>이메일:</strong> {selected.requesterEmail}</div>
                <div><strong>요청:</strong> {new Date(selected.createdAt).toLocaleString("ko-KR")}</div>
                <div>
                  <strong>현재 교회 상태:</strong>{" "}
                  {(selected.context === "portal_registration" || selected.context === "portal_general")
                    ? "해당 없음 (포탈 문의)"
                    : currentChurchStatus === null ? "확인 중..."
                    : currentChurchStatus === "gone" ? "교회 문서 없음 (이미 삭제됨)"
                    : currentChurchStatus === "active" ? "활성"
                    : currentChurchStatus === "hold" ? "보류"
                    : "정지"}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 0.375rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>제목</p>
                <div style={{ padding: "0.55rem 0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{selected.subject}</div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ margin: "0 0 0.375rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>문의 내용</p>
                <div style={{ padding: "0.625rem 0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.88rem", color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {selected.message}
                </div>
              </div>

              {selected.status === "pending" ? (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
                      처리 액션 선택
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                      {availableActions.map((a) => (
                        <label key={a} style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.55rem 0.75rem",
                          border: `1px solid ${action === a ? "#16649c" : "#e2e8f0"}`,
                          borderRadius: "8px", cursor: "pointer",
                          background: action === a ? "#f0f9ff" : "white",
                          fontSize: "0.88rem", fontWeight: 600, color: "#0f172a",
                        }}>
                          <input type="radio" name="status-action" checked={action === a} onChange={() => setAction(a)} />
                          {STATUS_REQUEST_ACTION_LABEL[a]}
                          {a === "delete" && <span style={{ fontSize: "0.72rem", color: "#b91c1c", fontWeight: 700 }}>· 교회 문서가 삭제됩니다</span>}
                          {a === "suspend" && <span style={{ fontSize: "0.72rem", color: "#b91c1c", fontWeight: 700 }}>· 이후 복구 불가</span>}
                          {a === "activate" && <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700 }}>· 교회가 정상 활성 상태로 전환</span>}
                          {a === "hold" && <span style={{ fontSize: "0.72rem", color: "#b45309", fontWeight: 700 }}>· 관리자 작업은 제한</span>}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                      처리 사유 <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="간단한 처리 사유 (교회 관리자에게도 표시됩니다)"
                      style={{ width: "100%", padding: "0.5rem 0.625rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={() => setSelected(null)} disabled={working} style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                      닫기
                    </button>
                    <button onClick={handleResolve} disabled={working || !action} style={{ padding: "0.55rem 1rem", border: "none", background: action ? "#16649c" : "#cbd5e1", color: "white", borderRadius: "8px", cursor: working || !action ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>check</span>
                      처리 실행
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "0.75rem 0.875rem", background: selected.status === "resolved" ? "#f0fdf4" : "#f8fafc", border: `1px solid ${selected.status === "resolved" ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: "8px", fontSize: "0.85rem" }}>
                  <div style={{ fontWeight: 700, color: selected.status === "resolved" ? "#15803d" : "#475569", marginBottom: "0.25rem" }}>
                    {selected.status === "resolved" ? "처리 완료" : "종결(반려)"}
                    {selected.resolvedAt && (
                      <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#64748b", marginLeft: "0.5rem" }}>
                        {new Date(selected.resolvedAt).toLocaleString("ko-KR")} · {selected.resolvedBy}
                      </span>
                    )}
                  </div>
                  {selected.resolvedAction && (
                    <div style={{ marginBottom: "0.25rem", color: "#334155" }}>
                      <strong>적용 액션:</strong> {STATUS_REQUEST_ACTION_LABEL[selected.resolvedAction]}
                    </div>
                  )}
                  {selected.resolverNote && <div style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{selected.resolverNote}</div>}
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

export default StatusRequestsPage;
