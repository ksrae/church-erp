import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../App";
import { Church } from "../../types/church";

function ChurchPortalSettings() {
  const { auth } = useAuth();
  const churchId = auth.type === "church" ? auth.admin.churchId : null;

  const [church, setChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [showAnnouncements, setShowAnnouncements] = useState(true);
  const [showSchedule, setShowSchedule] = useState(true);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !churchId) return;
    if (!file.type.startsWith("image/")) { flash("error", "이미지 파일만 업로드할 수 있습니다."); return; }
    if (file.size > 5 * 1024 * 1024) { flash("error", "이미지는 5MB 이하여야 합니다."); return; }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `churches/${churchId}/logo_${Date.now()}.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, "churches", churchId), { logo: url });
      setChurch((prev) => (prev ? { ...prev, logo: url } : prev));
      flash("success", "로고가 업데이트되었습니다.");
    } catch (err) {
      console.error(err);
      flash("error", "로고 업로드 중 오류가 발생했습니다.");
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleLogoRemove = async () => {
    if (!churchId || !church?.logo) return;
    if (!confirm("로고를 삭제하시겠습니까?")) return;
    try {
      await updateDoc(doc(db, "churches", churchId), { logo: "" });
      try { await deleteObject(storageRef(storage, church.logo)); } catch { /* ignore storage errors */ }
      setChurch((prev) => (prev ? { ...prev, logo: "" } : prev));
      flash("success", "로고가 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      flash("error", "삭제 중 오류가 발생했습니다.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !churchId) return;

    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) { flash("error", `${file.name}은 10MB를 초과합니다.`); continue; }
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
        flash("success", `${uploaded.length}장의 사진이 업로드되었습니다.`);
      }
    } catch (err) {
      console.error(err);
      flash("error", "사진 업로드 중 오류가 발생했습니다.");
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handlePhotoRemove = async (url: string) => {
    if (!churchId || !church) return;
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    try {
      const nextPhotos = (church.photos || []).filter((p) => p !== url);
      await updateDoc(doc(db, "churches", churchId), { photos: nextPhotos });
      try { await deleteObject(storageRef(storage, url)); } catch { /* ignore */ }
      setChurch((prev) => (prev ? { ...prev, photos: nextPhotos } : prev));
      flash("success", "사진이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      flash("error", "삭제 중 오류가 발생했습니다.");
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
      flash("success", "포탈 설정이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      flash("error", "저장 중 오류가 발생했습니다.");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite" }}>autorenew</span>
        <p>불러오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!church) {
    return <div style={{ padding: "2rem", color: "#ef4444" }}>교회 정보를 불러올 수 없습니다.</div>;
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.375rem" }}>교회 포탈 페이지</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
          성도 포탈에 노출되는 교회 브랜딩과 공개 범위를 설정합니다.
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

      {/* 로고 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>교회 로고</h2>
        <p style={hintStyle}>포탈 상단 로고와 교회 카드에 표시됩니다. (정사각형 권장, 5MB 이하)</p>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", marginTop: "1rem" }}>
          <div style={{
            width: "96px", height: "96px", borderRadius: "16px", overflow: "hidden",
            background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #e2e8f0",
          }}>
            {church.logo ? (
              <img src={church.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "2.5rem" }}>church</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <label style={primaryBtnStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>upload</span>
              {uploadingLogo ? "업로드 중..." : church.logo ? "로고 교체" : "로고 업로드"}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ display: "none" }} />
            </label>
            {church.logo && (
              <button onClick={handleLogoRemove} style={dangerBtnStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>delete</span>
                삭제
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 사진 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>교회 소개 사진</h2>
        <p style={hintStyle}>포탈 hero 영역에 노출됩니다. 여러 장을 업로드하면 자동 슬라이드됩니다. (각 10MB 이하)</p>
        <div style={{ marginTop: "1rem" }}>
          <label style={primaryBtnStyle}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add_photo_alternate</span>
            {uploadingPhoto ? "업로드 중..." : "사진 추가"}
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
                  title="삭제"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ ...hintStyle, marginTop: "1rem" }}>아직 등록된 사진이 없습니다.</p>
        )}
      </section>

      {/* 설명 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>교회 소개</h2>

        <label style={labelStyle}>한 줄 소개</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="예: 복음의 빛을 밝히는 공동체"
          maxLength={80}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: "1rem" }}>상세 소개</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="교회 소개 문구를 입력해주세요."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </section>

      {/* 공개 설정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>공개 설정</h2>
        <p style={hintStyle}>성도 포탈에서 각 섹션을 표시할지 여부를 선택합니다.</p>

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <ToggleRow
            label="공지사항 공개"
            hint="게시된 공지사항을 포탈에서 볼 수 있습니다."
            checked={showAnnouncements}
            onChange={setShowAnnouncements}
          />
          <ToggleRow
            label="일정 공개"
            hint="공개된 예배 및 행사 일정을 포탈에서 볼 수 있습니다."
            checked={showSchedule}
            onChange={setShowSchedule}
          />
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button onClick={handleSaveMeta} disabled={isSaving} style={{ ...primaryBtnStyle, padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>save</span>
          {isSaving ? "저장 중..." : "설정 저장"}
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
const dangerBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.375rem",
  padding: "0.625rem 1rem", background: "white", color: "#dc2626",
  border: "1px solid #fecaca", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
};

export default ChurchPortalSettings;
