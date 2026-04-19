import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, getDocs, query, collection, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { WorshipInstance, WorshipOrderItem, worshipTypeLabels } from "../../types/worship";
import { logActivity } from "../../utils/auditLog";

function WorshipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<WorshipInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bulletinFile, setBulletinFile] = useState<File | null>(null);
  const [isUploadingBulletin, setIsUploadingBulletin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      const snap = await getDoc(doc(db, "worshipInstances", id));
      if (snap.exists()) {
        setInstance({ id: snap.id, ...snap.data() } as WorshipInstance);
      }
      setIsLoading(false);
    };
    load();
  }, [id]);

  const computeDetailStatus = (inst: WorshipInstance): WorshipInstance["detailStatus"] => {
    if (!inst.title && !inst.preacher && inst.order.length === 0) return "empty";
    if (inst.title && inst.preacher && inst.scripture && inst.order.length > 0) return "complete";
    return "partial";
  };

  const handleSave = async () => {
    if (!instance || !id) return;
    setIsSaving(true);
    try {
      const updated = { ...instance, detailStatus: computeDetailStatus(instance), updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, "worshipInstances", id), {
        title: updated.title,
        preacher: updated.preacher,
        scripture: updated.scripture,
        order: updated.order,
        memo: updated.memo,
        isPublished: updated.isPublished,
        detailStatus: updated.detailStatus,
        updatedAt: serverTimestamp(),
      });
      setInstance(updated);
      await logActivity("WORSHIP", "예배 내역 수정", `${updated.date} ${worshipTypeLabels[updated.type]} 내역이 수정되었습니다.`);
      alert("저장되었습니다.");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulletinUpload = async () => {
    if (!bulletinFile || !id || !instance) return;
    setIsUploadingBulletin(true);
    try {
      const ext = bulletinFile.name.split(".").pop() || "pdf";
      const path = `bulletins/${id}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, bulletinFile);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "worshipInstances", id), {
        bulletinFileUrl: url,
        bulletinFileName: bulletinFile.name,
        updatedAt: serverTimestamp(),
      });
      setInstance((prev) => prev ? { ...prev, bulletinFileUrl: url, bulletinFileName: bulletinFile.name } : prev);
      setBulletinFile(null);
      await logActivity("WORSHIP", "주보 업로드", `${instance.date} 주보가 업로드되었습니다.`);
      alert("주보가 업로드되었습니다.");
    } catch (e: any) {
      alert(`업로드 실패: ${e.message}`);
    } finally {
      setIsUploadingBulletin(false);
    }
  };

  const loadPrevOrder = async () => {
    if (!instance) return;
    const q = query(collection(db, "worshipInstances"), orderBy("date", "desc"), limit(5));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      if (d.id !== id) {
        const prev = d.data() as WorshipInstance;
        if (prev.order && prev.order.length > 0) {
          if (confirm("이전 예배의 순서를 불러오시겠습니까?")) {
            setInstance((p) => p ? { ...p, order: prev.order.map((item, i) => ({ ...item, id: `order-${Date.now()}-${i}` })) } : p);
          }
          return;
        }
      }
    }
    alert("참고할 이전 예배 순서가 없습니다.");
  };

  const addOrderItem = () => {
    if (!instance) return;
    const newItem: WorshipOrderItem = { id: `order-${Date.now()}`, seq: instance.order.length + 1, name: "" };
    setInstance((p) => p ? { ...p, order: [...p.order, newItem] } : p);
  };

  const updateOrderItem = (itemId: string, field: keyof WorshipOrderItem, value: string) => {
    setInstance((p) => p ? {
      ...p, order: p.order.map((item) => item.id === itemId ? { ...item, [field]: value } : item),
    } : p);
  };

  const removeOrderItem = (itemId: string) => {
    setInstance((p) => p ? {
      ...p, order: p.order.filter((item) => item.id !== itemId).map((item, i) => ({ ...item, seq: i + 1 })),
    } : p);
  };

  const moveOrderItem = (itemId: string, direction: "up" | "down") => {
    if (!instance) return;
    const idx = instance.order.findIndex((item) => item.id === itemId);
    if (idx < 0) return;
    const newOrder = [...instance.order];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    setInstance((p) => p ? { ...p, order: newOrder.map((item, i) => ({ ...item, seq: i + 1 })) } : p);
  };

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center" }}>불러오는 중...</div>;
  if (!instance) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--danger)" }}>예배 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="page-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <button onClick={() => navigate("/worship")} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "white", border: "1px solid var(--border-color)", borderRadius: "0.5rem", width: "2.5rem", height: "2.5rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="page-header__title" style={{ margin: 0 }}>{instance.date} — {worshipTypeLabels[instance.type]}</h1>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
              <span style={{
                fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px",
                background: instance.detailStatus === "complete" ? "#dcfce7" : instance.detailStatus === "partial" ? "#fef3c7" : "#f1f5f9",
                color: instance.detailStatus === "complete" ? "#16a34a" : instance.detailStatus === "partial" ? "#d97706" : "#64748b",
              }}>
                {instance.detailStatus === "complete" ? "입력 완료" : instance.detailStatus === "partial" ? "입력 중" : "미입력"}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", cursor: "pointer" }}>
                <input type="checkbox" checked={instance.isPublished} onChange={(e) => setInstance((p) => p ? { ...p, isPublished: e.target.checked } : p)} />
                성도 포탈 공개
              </label>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* 설교 정보 */}
        <div className="form-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>설교 정보</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">설교 제목</label>
              <input type="text" className="form-input" placeholder="설교 제목" value={instance.title || ""} onChange={(e) => setInstance((p) => p ? { ...p, title: e.target.value } : p)} />
            </div>
            <div className="form-group">
              <label className="form-label">설교자</label>
              <input type="text" className="form-input" placeholder="설교자 이름" value={instance.preacher || ""} onChange={(e) => setInstance((p) => p ? { ...p, preacher: e.target.value } : p)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">성경 본문</label>
            <input type="text" className="form-input" placeholder="예: 요한복음 3:16" value={instance.scripture || ""} onChange={(e) => setInstance((p) => p ? { ...p, scripture: e.target.value } : p)} />
          </div>
          <div className="form-group">
            <label className="form-label">내부 메모 (포탈 미표시)</label>
            <textarea className="form-textarea" rows={2} placeholder="관리자용 메모" value={instance.memo || ""} onChange={(e) => setInstance((p) => p ? { ...p, memo: e.target.value } : p)} />
          </div>
        </div>

        {/* 예배 순서 */}
        <div className="form-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>예배 순서</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn--outline" onClick={loadPrevOrder} style={{ fontSize: "0.8rem", padding: "0.375rem 0.75rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>history</span>
                이전 예배에서 가져오기
              </button>
              <button className="btn btn--primary" onClick={addOrderItem} style={{ fontSize: "0.8rem", padding: "0.375rem 0.75rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>add</span>
                순서 추가
              </button>
            </div>
          </div>

          {instance.order.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", border: "2px dashed var(--border-color)", borderRadius: "8px" }}>
              <p>예배 순서 항목이 없습니다.</p>
              <p style={{ fontSize: "0.875rem" }}>"순서 추가" 버튼으로 항목을 추가하세요.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {instance.order.map((item, idx) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2rem 1fr 1fr 2fr auto", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{item.seq}</span>
                  <input type="text" className="form-input" placeholder="예: 대표기도" value={item.name} onChange={(e) => updateOrderItem(item.id, "name", e.target.value)} />
                  <input type="text" className="form-input" placeholder="담당자 (선택)" value={item.assignee || ""} onChange={(e) => updateOrderItem(item.id, "assignee", e.target.value)} />
                  <input type="text" className="form-input" placeholder="비고 (선택)" value={item.note || ""} onChange={(e) => updateOrderItem(item.id, "note", e.target.value)} />
                  <div style={{ display: "flex", gap: "2px" }}>
                    <button onClick={() => moveOrderItem(item.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1, padding: "2px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_upward</span>
                    </button>
                    <button onClick={() => moveOrderItem(item.id, "down")} disabled={idx === instance.order.length - 1} style={{ background: "none", border: "none", cursor: idx === instance.order.length - 1 ? "not-allowed" : "pointer", opacity: idx === instance.order.length - 1 ? 0.3 : 1, padding: "2px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_downward</span>
                    </button>
                    <button onClick={() => removeOrderItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "2px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 주보 파일 */}
        <div className="form-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>주보 파일</h2>
          {instance.bulletinFileUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: "8px", marginBottom: "1rem" }}>
              <span className="material-symbols-outlined" style={{ color: "#16a34a" }}>description</span>
              <a href={instance.bulletinFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>
                {instance.bulletinFileName || "주보 파일"}
              </a>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>업로드됨</span>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setBulletinFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
            <button className="btn btn--outline" onClick={() => fileInputRef.current?.click()}>
              <span className="material-symbols-outlined">upload_file</span>
              {instance.bulletinFileUrl ? "주보 교체" : "주보 업로드"}
            </button>
            {bulletinFile && (
              <>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{bulletinFile.name}</span>
                <button className="btn btn--primary" onClick={handleBulletinUpload} disabled={isUploadingBulletin}>
                  {isUploadingBulletin ? "업로드 중..." : "확인"}
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>PDF, JPG, PNG 파일을 지원합니다.</p>
        </div>

        {/* 저장 버튼 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="btn btn--outline" onClick={() => navigate("/worship")}>목록으로</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-outlined">save</span>
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorshipDetail;
