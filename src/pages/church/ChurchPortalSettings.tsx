import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../App";
import { Church } from "../../types/church";
import { useLocale } from "../../i18n/LocaleContext";

function ChurchPortalSettings() {
  const { auth } = useAuth();
  const { t } = useLocale();
  const churchId = auth.type === "church" ? auth.admin.churchId : null;

  const [church, setChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [showAnnouncements, setShowAnnouncements] = useState(true);
  const [showSchedule, setShowSchedule] = useState(true);

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!churchId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "churches", churchId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Church;
          setChurch(data);
          setTagline(data.tagline || "");
          setDescription(data.description || "");
          setShowAnnouncements(data.showAnnouncements !== false);
          setShowSchedule(data.showSchedule !== false);
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    })();
  }, [churchId]);

  const flash = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !churchId) return;

    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) { flash("error", t("portalSettings.photoTooLarge", { name: file.name })); continue; }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `churches/${churchId}/photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, file);
        uploaded.push(await getDownloadURL(r));
      }
      if (uploaded.length) {
        const nextPhotos = [...(church?.photos || []), ...uploaded];
        await updateDoc(doc(db, "churches", churchId), { photos: nextPhotos });
        setChurch((prev) => (prev ? { ...prev, photos: nextPhotos } : prev));
        flash("success", t("portalSettings.photoUploaded", { n: uploaded.length }));
      }
    } catch (err) {
      console.error(err);
      flash("error", t("portalSettings.photoUploadFailed"));
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handlePhotoRemove = async (url: string) => {
    if (!churchId || !church) return;
    if (!confirm(t("portalSettings.photoDeleteConfirm"))) return;
    try {
      const nextPhotos = (church.photos || []).filter((p) => p !== url);
      await updateDoc(doc(db, "churches", churchId), { photos: nextPhotos });
      try { await deleteObject(storageRef(storage, url)); } catch { /* ignore */ }
      setChurch((prev) => (prev ? { ...prev, photos: nextPhotos } : prev));
      flash("success", t("portalSettings.photoDeleted"));
    } catch (e) {
      console.error(e);
      flash("error", t("portalSettings.photoDeleteFailed"));
    }
  };

  const handleSaveMeta = async () => {
    if (!churchId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "churches", churchId), {
        tagline: tagline.trim(),
        description: description.trim(),
        showAnnouncements,
        showSchedule,
      });
      setChurch((prev) => (prev ? { ...prev, tagline, description, showAnnouncements, showSchedule } : prev));
      flash("success", t("portalSettings.saveSuccess"));
    } catch (e) {
      console.error(e);
      flash("error", t("portalSettings.saveFailed"));
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite" }}>autorenew</span>
        <p>{t("portalSettings.loading")}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!church) {
    return <div style={{ padding: "2rem", color: "#ef4444" }}>{t("portalSettings.notFound")}</div>;
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.375rem" }}>{t("portalSettings.title")}</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
          {t("portalSettings.description")}
        </p>
      </div>

      {message && (
        <div style={{
          padding: "0.75rem 1rem", borderRadius: "10px", marginBottom: "1rem",
          background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
          color: message.type === "success" ? "#065f46" : "#b91c1c",
          border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          fontSize: "0.9rem",
        }}>
          {message.text}
        </div>
      )}

      {/* 사진 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("portalSettings.photosTitle")}</h2>
        <p style={hintStyle}>
          {t("portalSettings.photosHint")}
        </p>
        <div style={{ marginTop: "1rem" }}>
          <label style={primaryBtnStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add_photo_alternate</span>
            {uploadingPhoto ? t("portalSettings.uploading") : t("portalSettings.addPhoto")}
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
          </label>
        </div>

        {church.photos && church.photos.length > 0 ? (
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {church.photos.map((url) => (
              <div key={url} style={{ position: "relative", aspectRatio: "16/10", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  onClick={() => handlePhotoRemove(url)}
                  style={{
                    position: "absolute", top: "8px", right: "8px",
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)", color: "white", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title={t("portalSettings.photoDelete")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ ...hintStyle, marginTop: "1rem" }}>{t("portalSettings.noPhotos")}</p>
        )}
      </section>

      {/* 설명 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("portalSettings.aboutTitle")}</h2>

        <label style={labelStyle}>{t("portalSettings.taglineLabel")}</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder={t("portalSettings.taglinePlaceholder")}
          maxLength={80}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: "1rem" }}>{t("portalSettings.descLabel")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={t("portalSettings.descPlaceholder")}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </section>

      {/* 공개 설정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("portalSettings.visibilityTitle")}</h2>
        <p style={hintStyle}>{t("portalSettings.visibilityHint")}</p>

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <ToggleRow
            label={t("portalSettings.announcementsLabel")}
            hint={t("portalSettings.announcementsHint")}
            checked={showAnnouncements}
            onChange={setShowAnnouncements}
          />
          <ToggleRow
            label={t("portalSettings.scheduleLabel")}
            hint={t("portalSettings.scheduleHint")}
            checked={showSchedule}
            onChange={setShowSchedule}
          />
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button onClick={handleSaveMeta} disabled={isSaving} style={{ ...primaryBtnStyle, padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>save</span>
          {isSaving ? t("portalSettings.saving") : t("portalSettings.saveBtn")}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "12px", cursor: "pointer",
      background: checked ? "#f0f9ff" : "white",
    }}>
      <div>
        <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{hint}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: "20px", height: "20px", cursor: "pointer" }}
      />
    </label>
  );
}

const sectionStyle: React.CSSProperties = {
  background: "white", borderRadius: "16px", padding: "1.5rem",
  border: "1px solid #e2e8f0", marginBottom: "1rem",
};
const h2Style: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" };
const hintStyle: React.CSSProperties = { fontSize: "0.85rem", color: "#64748b", margin: 0 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.375rem" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.75rem 0.875rem", fontSize: "0.9rem",
  border: "1px solid #e2e8f0", borderRadius: "10px", outline: "none", boxSizing: "border-box",
  background: "white",
};
const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.375rem",
  padding: "0.625rem 1rem", background: "#16649c", color: "white",
  border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
};
export default ChurchPortalSettings;
