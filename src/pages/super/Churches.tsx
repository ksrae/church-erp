import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Church } from "../../types/church";

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-");
}

function Churches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setIsSaving(true);
    try {
      const licenseKey = generateLicenseKey();
      const data: Omit<Church, "id"> = {
        name: form.name.trim(),
        licenseKey,
        isActive: true,
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
    if (!confirm(`"${church.name}"의 라이선스 키를 재발급하시겠습니까?\n기존 키는 즉시 무효화됩니다.`)) return;
    const newKey = generateLicenseKey();
    await updateDoc(doc(db, "churches", church.id), { licenseKey: newKey });
    setChurches((prev) => prev.map((c) => c.id === church.id ? { ...c, licenseKey: newKey } : c));
  };

  const handleDelete = async (church: Church) => {
    if (!confirm(`"${church.name}" 교회를 삭제하시겠습니까?\n라이선스 키가 무효화되고 해당 교회 관리자는 접근할 수 없게 됩니다.`)) return;
    await deleteDoc(doc(db, "churches", church.id));
    setChurches((prev) => prev.filter((c) => c.id !== church.id));
  };

  const handleToggleActive = async (church: Church) => {
    await updateDoc(doc(db, "churches", church.id), { isActive: !church.isActive });
    setChurches((prev) => prev.map((c) => c.id === church.id ? { ...c, isActive: !c.isActive } : c));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

      {/* 통계 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "전체 교회", value: churches.length, icon: "business", color: "#3b82f6" },
          { label: "활성 교회", value: churches.filter((c) => c.isActive).length, icon: "check_circle", color: "#10b981" },
          { label: "비활성 교회", value: churches.filter((c) => !c.isActive).length, icon: "cancel", color: "#94a3b8" },
        ].map((s) => (
          <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.5rem", color: s.color }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 교회 목록 */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>불러오는 중...</div>
      ) : churches.length === 0 ? (
        <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", display: "block", marginBottom: "0.75rem" }}>business</span>
          <p style={{ color: "#64748b" }}>등록된 교회가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {churches.map((church) => (
            <div key={church.id} style={{ background: "white", borderRadius: "12px", padding: "1.25rem 1.5rem", border: "1px solid #e2e8f0", opacity: church.isActive ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1e293b", margin: 0 }}>{church.name}</h3>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", background: church.isActive ? "#dcfce7" : "#f1f5f9", color: church.isActive ? "#16a34a" : "#64748b" }}>
                      {church.isActive ? "활성" : "비활성"}
                    </span>
                  </div>
                  {church.pastorName && <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 0.25rem" }}>담임목사: {church.pastorName}</p>}
                  {church.address && <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>{church.address}</p>}

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
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggleActive(church)}
                    style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: "0.8rem", color: "#475569" }}
                  >
                    {church.isActive ? "비활성화" : "활성화"}
                  </button>
                  <button
                    onClick={() => handleReissue(church)}
                    style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: "0.8rem", color: "#475569", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>refresh</span>
                    키 재발급
                  </button>
                  <button
                    onClick={() => handleDelete(church)}
                    style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", fontSize: "0.8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
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

export default Churches;
