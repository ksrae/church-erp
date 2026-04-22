import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Church, ChurchStatus, getChurchStatus } from "../../types/church";

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-");
}

const STATUS_LABEL: Record<ChurchStatus, string> = {
  active: "활성",
  hold: "보류",
  suspended: "정지",
};

const STATUS_COLOR: Record<ChurchStatus, { bg: string; fg: string }> = {
  active: { bg: "#dcfce7", fg: "#16a34a" },
  hold: { bg: "#fef3c7", fg: "#b45309" },
  suspended: { bg: "#fee2e2", fg: "#b91c1c" },
};

type ChurchFilter = "all" | ChurchStatus;

function Churches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChurchFilter>("all");

  const [form, setForm] = useState({
    name: "", pastorName: "", address: "", phone: "", email: "", website: "",
  });

  useEffect(() => { loadChurches(); }, []);

  const loadChurches = async () => {
    setIsLoading(true);
    const snap = await getDocs(query(collection(db, "churches"), orderBy("createdAt", "desc")));
    setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { alert("교회 이름을 입력하세요."); return; }

    const optionalFields: { key: keyof typeof form; label: string }[] = [
      { key: "pastorName", label: "담임목사" },
      { key: "address", label: "주소" },
      { key: "phone", label: "전화번호" },
      { key: "email", label: "이메일" },
      { key: "website", label: "홈페이지" },
    ];
    const missing = optionalFields.filter((f) => !form[f.key].trim());
    if (missing.length > 0) {
      const ok = confirm(
        `입력되지 않은 항목이 있습니다:\n\n` +
        missing.map((m) => `• ${m.label}`).join("\n") +
        `\n\n입력되지 않은 정보는 교회 관리자가 직접 수정할 수 없으며,\n` +
        `수정이 필요할 경우 시스템 관리자에게 "수정 요청"을 통해 변경을 요청해야 합니다.\n\n` +
        `이대로 진행하시겠습니까?`
      );
      if (!ok) return;
    }

    setIsSaving(true);
    try {
      const licenseKey = generateLicenseKey();
      const data: Omit<Church, "id"> = {
        name: form.name.trim(),
        licenseKey,
        isActive: true,
        status: "active",
        createdAt: new Date().toISOString(),
        pastorName: form.pastorName,
        address: form.address,
        phone: form.phone,
        email: form.email,
        website: form.website,
      };
      const ref = await addDoc(collection(db, "churches"), { ...data, createdAt: serverTimestamp() });
      setChurches((prev) => [{ id: ref.id, ...data }, ...prev]);
      setForm({ name: "", pastorName: "", address: "", phone: "", email: "", website: "" });
      setShowModal(false);
    } catch (e: any) {
      alert(`생성 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReissue = async (church: Church) => {
    const status = getChurchStatus(church);
    if (status === "suspended") { alert("정지된 교회는 라이선스 키를 재발급할 수 없습니다."); return; }
    if (!confirm(`"${church.name}"의 라이선스 키를 재발급하시겠습니까?\n기존 키는 즉시 무효화됩니다.`)) return;
    const newKey = generateLicenseKey();
    await updateDoc(doc(db, "churches", church.id), { licenseKey: newKey });
    setChurches((prev) => prev.map((c) => c.id === church.id ? { ...c, licenseKey: newKey } : c));
  };

  const handleDelete = async (church: Church) => {
    if (!confirm(`"${church.name}" 교회를 완전히 삭제하시겠습니까?\n라이선스 키가 무효화되고 해당 교회 관리자는 접근할 수 없게 됩니다.`)) return;
    await deleteDoc(doc(db, "churches", church.id));
    setChurches((prev) => prev.filter((c) => c.id !== church.id));
  };

  const handleSetStatus = async (church: Church, next: ChurchStatus) => {
    const current = getChurchStatus(church);
    if (current === "suspended") { alert("정지된 교회의 상태는 변경할 수 없습니다."); return; }
    if (current === next) return;

    if (next === "suspended") {
      const input = prompt(
        `"${church.name}" 교회를 정지시키려 합니다.\n\n` +
        `⚠ 정지는 되돌릴 수 없습니다.\n` +
        `- 성도 포탈 목록/검색에서 제거됩니다.\n` +
        `- 이 교회를 내 교회로 설정한 성도들은 자동 해제됩니다.\n` +
        `- 기존 관리자의 로그인이 차단됩니다.\n\n` +
        `진행하려면 교회 이름을 정확히 입력하세요.`
      );
      if (input === null) return;
      if (input.trim() !== church.name) { alert("교회 이름이 일치하지 않아 취소되었습니다."); return; }
    } else if (next === "hold") {
      const reason = prompt(`"${church.name}" 교회를 보류 처리합니다.\n\n- 관리자 작업이 중단되지만 성도 열람은 가능합니다.\n- 언제든지 다시 활성화할 수 있습니다.\n\n(선택) 사유를 입력하세요:`);
      if (reason === null) return; // 취소
      const patch = {
        status: "hold" as ChurchStatus,
        statusReason: reason.trim(),
        statusChangedAt: new Date().toISOString(),
        isActive: true, // 보류는 성도 포탈 노출 유지
      };
      await updateDoc(doc(db, "churches", church.id), patch);
      setChurches((prev) => prev.map((c) => c.id === church.id ? { ...c, ...patch } : c));
      return;
    } else if (next === "active") {
      if (!confirm(`"${church.name}" 교회를 다시 활성화하시겠습니까?`)) return;
    }

    // isActive 의미: "정지되지 않음" → 성도 포탈 노출 여부.
    // active / hold 는 true, suspended 만 false.
    const patch: Partial<Church> = {
      status: next,
      statusChangedAt: new Date().toISOString(),
      isActive: next !== "suspended",
    };
    await updateDoc(doc(db, "churches", church.id), patch as any);
    setChurches((prev) => prev.map((c) => c.id === church.id ? { ...c, ...patch } : c));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const countByStatus = (s: ChurchStatus) => churches.filter((c) => getChurchStatus(c) === s).length;

  const filteredChurches = filter === "all"
    ? churches
    : churches.filter((c) => getChurchStatus(c) === filter);

  const filterLabel: Record<ChurchFilter, string> = {
    all: "전체",
    active: "활성",
    hold: "보류",
    suspended: "정지",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>교회 관리</h1>
          <p style={{ color: "#64748b", marginTop: "0.375rem", fontSize: "0.9rem" }}>교회를 생성하고 라이선스 키를 발급합니다.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>add</span>
          교회 추가
        </button>
      </div>

      {/* 통계 / 필터 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {([
          { key: "all" as ChurchFilter, label: "전체 교회", value: churches.length, icon: "business", color: "#3b82f6" },
          { key: "active" as ChurchFilter, label: "활성", value: countByStatus("active"), icon: "check_circle", color: "#16a34a" },
          { key: "hold" as ChurchFilter, label: "보류", value: countByStatus("hold"), icon: "pause_circle", color: "#b45309" },
          { key: "suspended" as ChurchFilter, label: "정지", value: countByStatus("suspended"), icon: "block", color: "#b91c1c" },
        ]).map((s) => {
          const active = filter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              aria-pressed={active}
              style={{
                textAlign: "left", cursor: "pointer",
                background: active ? "#eff6ff" : "white",
                borderRadius: "12px", padding: "1.25rem",
                border: `1px solid ${active ? s.color : "#e2e8f0"}`,
                boxShadow: active ? `0 0 0 3px ${s.color}22` : "none",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.5rem", color: s.color }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>{s.value}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filter !== "all" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#1d4ed8" }}>filter_alt</span>
          <span style={{ fontSize: "0.82rem", color: "#1e3a8a" }}>
            <strong>{filterLabel[filter]}</strong> 상태로 필터링 중 · {filteredChurches.length}개
          </span>
          <button
            onClick={() => setFilter("all")}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#1d4ed8", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>close</span>
            필터 해제
          </button>
        </div>
      )}

      {/* 교회 목록 */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>불러오는 중...</div>
      ) : churches.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>business</span>
          <p style={{ color: "#64748b" }}>등록된 교회가 없습니다.</p>
        </div>
      ) : filteredChurches.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>filter_alt_off</span>
          <p style={{ color: "#64748b", margin: "0 0 0.5rem" }}>
            <strong>{filterLabel[filter]}</strong> 상태의 교회가 없습니다.
          </p>
          <button
            onClick={() => setFilter("all")}
            style={{ marginTop: "0.5rem", padding: "0.45rem 0.9rem", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", color: "#334155", fontWeight: 600, fontSize: "0.85rem" }}
          >
            전체 보기
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredChurches.map((church) => {
            const status = getChurchStatus(church);
            const color = STATUS_COLOR[status];
            return (
              <div key={church.id} style={{ background: "white", borderRadius: "12px", padding: "1.25rem 1.5rem", border: "1px solid #e2e8f0", opacity: status === "suspended" ? 0.7 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                      <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1e293b", margin: 0 }}>{church.name}</h3>
                      <span style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: "10px", background: color.bg, color: color.fg, fontWeight: 700 }}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    {church.pastorName && <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 0.25rem" }}>담임목사: {church.pastorName}</p>}
                    {church.address && <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>{church.address}</p>}
                    {church.statusReason && (status === "hold" || status === "suspended") && (
                      <p style={{ fontSize: "0.78rem", color: color.fg, margin: "0.375rem 0 0", padding: "0.375rem 0.625rem", background: color.bg, borderRadius: "6px", display: "inline-block" }}>
                        사유: {church.statusReason}
                      </p>
                    )}

                    {/* 라이선스 키 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.875rem", padding: "0.625rem 0.875rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", width: "fit-content" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#64748b" }}>key</span>
                      <code style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", letterSpacing: "0.1em", fontFamily: "monospace" }}>
                        {church.licenseKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(church.licenseKey, church.id)}
                        title="복사"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: copiedId === church.id ? "#16a34a" : "#94a3b8" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                          {copiedId === church.id ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {status === "active" && (
                      <>
                        <button onClick={() => handleSetStatus(church, "hold")} style={btnWarn}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>pause_circle</span>
                          보류
                        </button>
                        <button onClick={() => handleSetStatus(church, "suspended")} style={btnDanger}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>block</span>
                          정지
                        </button>
                      </>
                    )}
                    {status === "hold" && (
                      <>
                        <button onClick={() => handleSetStatus(church, "active")} style={btnSuccess}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>restart_alt</span>
                          활성화
                        </button>
                        <button onClick={() => handleSetStatus(church, "suspended")} style={btnDanger}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>block</span>
                          정지
                        </button>
                      </>
                    )}
                    {status !== "suspended" && (
                      <button onClick={() => handleReissue(church)} style={btnNeutral}>
                        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>refresh</span>
                        키 재발급
                      </button>
                    )}
                    <button onClick={() => handleDelete(church)} style={btnDelete}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 교회 추가 모달 */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>교회 추가</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {[
              { key: "name", label: "교회 이름 *", placeholder: "예: 시온교회" },
              { key: "pastorName", label: "담임목사", placeholder: "홍길동" },
              { key: "address", label: "주소", placeholder: "서울시 강남구..." },
              { key: "phone", label: "전화번호", placeholder: "02-1234-5678" },
              { key: "email", label: "이메일", placeholder: "church@example.com" },
              { key: "website", label: "홈페이지", placeholder: "https://church.com" },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>{field.label}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "0.625rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600 }}>취소</button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                style={{ padding: "0.625rem 1.25rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "8px", cursor: isSaving ? "not-allowed" : "pointer", fontWeight: 600 }}
              >
                {isSaving ? "생성 중..." : "교회 생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: "0.25rem",
  border: "1px solid",
};
const btnNeutral: React.CSSProperties = { ...btnBase, borderColor: "#e2e8f0", background: "white", color: "#475569" };
const btnWarn: React.CSSProperties = { ...btnBase, borderColor: "#fcd34d", background: "#fffbeb", color: "#b45309" };
const btnSuccess: React.CSSProperties = { ...btnBase, borderColor: "#86efac", background: "#f0fdf4", color: "#15803d" };
const btnDanger: React.CSSProperties = { ...btnBase, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" };
const btnDelete: React.CSSProperties = { ...btnBase, borderColor: "#fca5a5", background: "#fef2f2", color: "#dc2626" };

export default Churches;
