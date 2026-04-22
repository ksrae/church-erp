import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { Announcement, AnnouncementCategory, categoryLabels } from "../../types/announcement";
import { logActivity } from "../../utils/auditLog";
import { useAuth } from "../../App";
import { useLocale } from "../../i18n/LocaleContext";

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
  const { t } = useLocale();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { auth: authState } = useAuth();
  const churchId = authState.type === "church" ? authState.admin.churchId : "";

  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const categoryLabel = (cat: AnnouncementCategory): string => {
    const key = `announcement.category.${cat}`;
    const translated = t(key as any);
    return translated === key ? categoryLabels[cat] : translated;
  };

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
      alert(t("ann.edit.uploadFailed", { msg: e.message }));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setForm((p) => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!form.title.trim()) { alert(t("ann.edit.titleRequired")); return; }
    if (!form.content.trim()) { alert(t("ann.edit.contentRequired")); return; }

    setIsSaving(true);
    try {
      const username = auth.currentUser?.email?.split("@")[0] || t("ann.edit.defaultAdmin");
      const data = {
        ...form,
        status,
        endDate: form.endDate || undefined,
        updatedAt: new Date().toISOString(),
      };

      if (isEdit && id) {
        await updateDoc(doc(db, "announcements", id), { ...data, updatedAt: serverTimestamp() });
        await logActivity(
          "ANNOUNCEMENT",
          t("ann.audit.updateTitle"),
          t("ann.audit.updateBody", { title: form.title }),
          username,
        );
      } else {
        await addDoc(collection(db, "announcements"), {
          ...data,
          churchId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: username,
        });
        await logActivity(
          "ANNOUNCEMENT",
          t("ann.audit.createTitle"),
          t("ann.audit.createBody", { title: form.title }),
          username,
        );
      }
      navigate("/announcements");
    } catch (e: any) {
      alert(t("ann.edit.saveFailed", { msg: e.message }));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center" }}>{t("ann.edit.loading")}</div>;

  return (
    <div className="page-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/announcements")} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "white", border: "1px solid var(--border-color)", borderRadius: "0.5rem", width: "2.5rem", height: "2.5rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="page-header__title" style={{ margin: 0 }}>{isEdit ? t("ann.edit.editTitle") : t("ann.edit.newTitle")}</h1>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="form-card">
          <div className="form-group">
            <label className="form-label">{t("ann.edit.field.title")} *</label>
            <input type="text" className="form-input" placeholder={t("ann.edit.field.titlePlaceholder")} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t("ann.edit.field.category")}</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as AnnouncementCategory }))}>
                {(Object.keys(categoryLabels) as AnnouncementCategory[]).map((k) => (
                  <option key={k} value={k}>{categoryLabel(k)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))} />
                {t("ann.edit.field.pinned")}
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t("ann.edit.field.startDate")} *</label>
              <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t("ann.edit.field.endDate")}</label>
              <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t("ann.edit.field.content")} *</label>
            <textarea
              className="form-textarea"
              rows={10}
              placeholder={t("ann.edit.field.contentPlaceholder")}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* 첨부파일 */}
        <div className="form-card">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>{t("ann.edit.attachTitle")}</h3>
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
            {isUploading ? t("ann.edit.uploading") : t("ann.edit.addFile")}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="btn btn--outline" onClick={() => navigate("/announcements")}>{t("common.cancel")}</button>
          <button className="btn btn--outline" onClick={() => handleSave("draft")} disabled={isSaving}>{t("ann.edit.saveDraft")}</button>
          <button className="btn btn--primary" onClick={() => handleSave("published")} disabled={isSaving}>
            <span className="material-symbols-outlined">publish</span>
            {isSaving ? t("ann.edit.publishing") : t("ann.edit.publish")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementEdit;
