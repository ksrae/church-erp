import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { saveChurchAdmin, firebaseSignOut, LICENSE_RESET_REASON_KEY } from "../../utils/adminSecurity";
import { ChurchAdmin, Church, getChurchStatus } from "../../types/church";
import ChurchStatusRequestModal from "../../components/ChurchStatusRequestModal";
import { subscribeRequesterStatusRequests } from "../../utils/statusRequests";
import { ChurchStatusRequest } from "../../types/statusRequest";
import { useLocale } from "../../i18n/LocaleContext";

interface LicenseSetupProps {
  pendingUser: { uid: string; email: string; displayName: string; photoURL?: string };
  onSetupComplete: (admin: ChurchAdmin) => void;
}

function LicenseSetup({ pendingUser, onSetupComplete }: LicenseSetupProps) {
  const { t } = useLocale();
  const [licenseKey, setLicenseKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resetReason, setResetReason] = useState<string>("");
  const [showStatusRequestModal, setShowStatusRequestModal] = useState(false);
  const [myRequests, setMyRequests] = useState<ChurchStatusRequest[]>([]);

  useEffect(() => {
    const reason = sessionStorage.getItem(LICENSE_RESET_REASON_KEY);
    if (reason) {
      setResetReason(reason);
      sessionStorage.removeItem(LICENSE_RESET_REASON_KEY);
    }
  }, []);

  useEffect(() => {
    if (!pendingUser.uid) return;
    const unsub = subscribeRequesterStatusRequests(pendingUser.uid, setMyRequests);
    return unsub;
  }, [pendingUser.uid]);

  const handleVerify = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) { setError(t("license.err.keyRequired")); return; }

    setIsVerifying(true);
    setError("");
    try {
      const q = query(collection(db, "churches"), where("licenseKey", "==", key));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError(t("license.err.invalid"));
        return;
      }

      const church = { id: snap.docs[0].id, ...snap.docs[0].data() } as Church;
      const status = getChurchStatus(church);
      if (status === "suspended") {
        setError(t("license.err.suspended"));
        return;
      }
      if (status === "hold") {
        setError(t("license.err.hold"));
        return;
      }

      const adminQ = query(collection(db, "churchAdmins"), where("churchId", "==", church.id));
      const adminSnap = await getDocs(adminQ);
      if (!adminSnap.empty) {
        const existingAdmin = adminSnap.docs[0].data() as ChurchAdmin;
        if (existingAdmin.uid !== pendingUser.uid) {
          setError(t("license.err.alreadyRegistered"));
          return;
        }
      }

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
      setError(t("license.err.generic"));
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
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
              {resetReason ? t("license.titleReset") : t("license.title")}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
              {t("license.greeting", { name: pendingUser.displayName })}<br />
              {resetReason ? t("license.subtitleReset") : t("license.subtitle")}
            </p>
          </div>

          {resetReason && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#b45309", flexShrink: 0 }}>info</span>
              <p style={{ fontSize: "0.85rem", color: "#78350f", margin: 0, lineHeight: 1.55 }}>{resetReason}</p>
            </div>
          )}

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#ef4444", flexShrink: 0 }}>error</span>
              <p style={{ fontSize: "0.875rem", color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("license.keyLabel")}</label>
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
            {isVerifying ? t("license.verifying") : t("license.verify")}
          </button>

          <button
            onClick={() => setShowStatusRequestModal(true)}
            style={{ width: "100%", marginTop: "0.75rem", padding: "0.75rem", background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", boxSizing: "border-box" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>contact_support</span>
            {t("license.contactAdmin")}
          </button>

          {myRequests.length > 0 && (
            <div style={{ marginTop: "0.875rem", padding: "0.75rem 0.875rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>{t("license.myRequestsTitle")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {myRequests.slice(0, 3).map((r) => {
                  const badge = r.status === "pending"
                    ? { text: t("license.request.pending"), bg: "#fef3c7", color: "#b45309", border: "#fde68a" }
                    : r.status === "resolved"
                    ? { text: t("license.request.resolved"), bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" }
                    : { text: t("license.request.closed"), bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
                  return (
                    <div key={r.id} style={{ fontSize: "0.75rem", color: "#475569", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", borderRadius: "999px", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.text}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem", background: "transparent", color: "#94a3b8", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "0.875rem" }}
          >
            {t("license.signInOther")}
          </button>
        </div>
      </div>

      {showStatusRequestModal && (
        <ChurchStatusRequestModal
          context="deleted"
          churchId={null}
          churchName={""}
          requester={{ uid: pendingUser.uid, email: pendingUser.email, displayName: pendingUser.displayName }}
          onClose={() => setShowStatusRequestModal(false)}
          onSubmitted={() => setShowStatusRequestModal(false)}
        />
      )}
    </div>
  );
}

export default LicenseSetup;
