import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { Announcement, AnnouncementCategory, categoryLabels } from "../../types/announcement";
import { logActivity } from "../../utils/auditLog";
import { useAuth } from "../../App";

const defaultForm: Omit<Announcement, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  content: "",
  category: "notice",
  isPinned: false,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  attachments: [],
  status: "draft",
};

function AnnouncementEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { auth: authState } = useAuth();
  const churchId = authState.type === "church" ? authState.admin.churchId : "";

  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "announcements", id));
      if (snap.exists()) {
        const data = snap.data() as Announcement;
        setForm({
          title: data.title,
          content: data.content,
          category: data.category,
          isPinned: data.isPinned,
          startDate: data.startDate,
          endDate: data.endDate || "",
          attachments: data.attachments || [],
          status: data.status,
        });
      }
      setIsLoading(false);
    };
    load();
  }, [id, isEdit]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const path = `announcements/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((p) => ({ ...p, attachments: [...p.attachments, { name: file.name, url }] }));
    } catch (e: any) {
      alert(`업로드 실패: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setForm((p) => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    if (!form.content.trim()) { alert("내용을 입력해주세요."); return; }

    setIsSaving(true);
    try {
      const username = auth.currentUser?.email?.split("@")[0] || "관리자";
      const data = {
        ...form,
        status,
        endDate: form.endDate || undefined,
        updatedAt: new Date().toISOString(),
      };

      if (isEdit && id) {
        await updateDoc(doc(db, "announcements", id), { ...data, updatedAt: serverTimestamp() });
        await logActivity("ANNOUNCEMENT", "공지 수정", `"${form.title}" 공지가 수정되었습니다.`, username);
      } else {
        await addDoc(collection(db, "announcements"), {
          ...data,
          churchId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: username,
        });
        await logActivity("ANNOUNCEMENT", "공지 등록", `"${form.title}" 공지가 등록되었습니다.`, username);
      }
      navigate("/announcements");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center" }}>불러오는 중...</div>;

  return (
    <div className="page-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/announcements")} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "white", border: "1px solid var(--border-color)", borderRadius: "0.5rem", width: "2.5rem", height: "2.5rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="page-header__title" style={{ margin: 0 }}>{isEdit ? "공지 수정" : "공지 작성"}</h1>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="form-card">
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input type="text" className="form-input" placeholder="공지 제목을 입력하세요" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as AnnouncementCategory }))}>
                {(Object.keys(categoryLabels) as AnnouncementCategory[]).map((k) => (
                  <option key={k} value={k}>{categoryLabels[k]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))} />
                상단 고정
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">게시 시작일 *</label>
              <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">게시 종료일 (없으면 무기한)</label>
              <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">내용 *</label>
            <textarea
              className="form-textarea"
              rows={10}
              placeholder="공지 내용을 입력하세요..."
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* 첨부파일 */}
        <div className="form-card">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>첨부파일</h3>
          {form.attachments.map((att, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "6px", marginBottom: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "1.25rem" }}>attach_file</span>
              <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: "var(--primary)" }}>{att.name}</a>
              <button onClick={() => removeAttachment(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
              </button>
            </div>
          ))}
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} style={{ display: "none" }} />
          <button className="btn btn--outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <span className="material-symbols-outlined">upload_file</span>
            {isUploading ? "업로드 중..." : "파일 추가"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="btn btn--outline" onClick={() => navigate("/announcements")}>취소</button>
          <button className="btn btn--outline" onClick={() => handleSave("draft")} disabled={isSaving}>임시저장</button>
          <button className="btn btn--primary" onClick={() => handleSave("published")} disabled={isSaving}>
            <span className="material-symbols-outlined">publish</span>
            {isSaving ? "게시 중..." : "게시"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementEdit;
