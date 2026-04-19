import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { saveChurchAdmin, firebaseSignOut } from "../../utils/adminSecurity";
import { ChurchAdmin, Church } from "../../types/church";

interface LicenseSetupProps {
  pendingUser: { uid: string; email: string; displayName: string; photoURL?: string };
  onSetupComplete: (admin: ChurchAdmin) => void;
}

function LicenseSetup({ pendingUser, onSetupComplete }: LicenseSetupProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) { setError("라이선스 키를 입력해주세요."); return; }

    setIsVerifying(true);
    setError("");
    try {
      // 라이선스 키로 교회 찾기
      const q = query(collection(db, "churches"), where("licenseKey", "==", key), where("isActive", "==", true));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("유효하지 않은 라이선스 키입니다. 다시 확인해주세요.");
        return;
      }

      const church = { id: snap.docs[0].id, ...snap.docs[0].data() } as Church;

      // 이미 다른 관리자가 등록된 교회인지 확인
      const adminQ = query(collection(db, "churchAdmins"), where("churchId", "==", church.id));
      const adminSnap = await getDocs(adminQ);
      if (!adminSnap.empty) {
        const existingAdmin = adminSnap.docs[0].data() as ChurchAdmin;
        if (existingAdmin.uid !== pendingUser.uid) {
          setError("이미 다른 관리자가 등록된 교회입니다.");
          return;
        }
      }

      // 교회 관리자로 등록
      const admin: ChurchAdmin = {
        uid: pendingUser.uid,
        email: pendingUser.email,
        displayName: pendingUser.displayName,
        photoURL: pendingUser.photoURL,
        churchId: church.id,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      await saveChurchAdmin(admin);
      onSetupComplete(admin);
    } catch (e: any) {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await firebaseSignOut();
    window.location.href = "/";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "440px", padding: "1rem" }}>
        <div style={{ background: "white", borderRadius: "1.5rem", padding: "2.5rem 2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", background: "linear-gradient(135deg, #16649c 0%, #0d4f7a 100%)", borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <span className="material-symbols-outlined" style={{ color: "white", fontSize: "1.75rem" }}>key</span>
            </div>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>라이선스 키 입력</h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
              {pendingUser.displayName}님, 안녕하세요.<br />
              교회에서 발급받은 라이선스 키를 입력하세요.
            </p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#ef4444", flexShrink: 0 }}>error</span>
              <p style={{ fontSize: "0.875rem", color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>라이선스 키</label>
            <input
              type="text"
              className="form-input"
              placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
              style={{ textAlign: "center", letterSpacing: "0.15em", fontFamily: "monospace", fontSize: "1rem" }}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            style={{ width: "100%", padding: "0.875rem", background: "#16649c", color: "white", border: "none", borderRadius: "10px", cursor: isVerifying ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "1rem" }}
          >
            {isVerifying ? "확인 중..." : "확인"}
          </button>

          <button
            onClick={handleLogout}
            style={{ width: "100%", marginTop: "0.75rem", padding: "0.75rem", background: "transparent", color: "#94a3b8", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "0.875rem" }}
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

export default LicenseSetup;
