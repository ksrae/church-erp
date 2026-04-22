import { useState } from "react";
import { createStatusRequest } from "../utils/statusRequests";
import { StatusRequestContext } from "../types/statusRequest";
import { useLocale } from "../i18n/LocaleContext";

type PortalContext = Extract<StatusRequestContext, "portal_registration" | "portal_general">;

interface Props {
  defaultContext?: PortalContext;
  onClose: () => void;
}

function PortalInquiryModal({ defaultContext = "portal_general", onClose }: Props) {
  const { t } = useLocale();
  const defaultSubjects: Record<PortalContext, string> = {
    portal_registration: t("inquiry.subjectDefault.portal_registration"),
    portal_general: t("inquiry.subjectDefault.portal_general"),
  };
  const [context, setContext] = useState<PortalContext>(defaultContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubjects[defaultContext]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (!name.trim()) { setError(t("inquiry.errorName")); return; }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setError(t("inquiry.errorEmail")); return; }
    if (!subject.trim()) { setError(t("inquiry.errorSubject")); return; }
    if (!message.trim()) { setError(t("inquiry.errorMessage")); return; }

    setSubmitting(true);
    try {
      await createStatusRequest({
        churchId: null,
        churchName: "",
        context,
        requesterUid: "",
        requesterEmail: email.trim(),
        requesterName: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setDone(true);
    } catch (e: any) {
      console.error(e);
      setError(t("inquiry.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleContextChange = (next: PortalContext) => {
    setContext(next);
    const isDefaultSubject = Object.values(defaultSubjects).includes(subject);
    if (!subject.trim() || isDefaultSubject) {
      setSubject(defaultSubjects[next]);
    }
  };

  return (
    <div
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "14px", width: "100%", maxWidth: "520px",
          maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ padding: "1.125rem 1.375rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="material-symbols-outlined" style={{ color: "#16649c" }}>mail</span>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
            {t("inquiry.title")}
          </h3>
          <button
            onClick={() => !submitting && onClose()}
            style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {done ? (
          <div style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.875rem" }}>
              <span className="material-symbols-outlined" style={{ color: "#15803d", fontSize: "1.875rem" }}>check_circle</span>
            </div>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t("inquiry.successTitle")}</h4>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b", lineHeight: 1.55 }}>
              {t("inquiry.successBody")}
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: "1.25rem", padding: "0.55rem 1.25rem", border: "none", background: "#16649c", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" }}
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <div style={{ padding: "1.125rem 1.375rem" }}>
            <div style={{ marginBottom: "0.875rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>{t("inquiry.kindLabel")}</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["portal_registration", "portal_general"] as PortalContext[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleContextChange(c)}
                    style={{
                      flex: 1, padding: "0.5rem 0.75rem",
                      border: `1px solid ${context === c ? "#16649c" : "#e2e8f0"}`,
                      background: context === c ? "#eff6ff" : "white",
                      color: context === c ? "#16649c" : "#334155",
                      borderRadius: "8px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {t(`statusRequest.context.${c}` as const)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                  {t("inquiry.nameLabel")} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("inquiry.namePlaceholder")}
                  style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                  {t("inquiry.emailLabel")} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "0.875rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                {t("inquiry.subjectLabel")} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
                {t("inquiry.messageLabel")} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder={t("inquiry.messagePlaceholder")}
                style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.625rem 0.875rem", marginBottom: "0.875rem", color: "#dc2626", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => !submitting && onClose()}
                disabled={submitting}
                style={{ padding: "0.55rem 1rem", border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                style={{ padding: "0.55rem 1rem", border: "none", background: "#16649c", color: "white", borderRadius: "8px", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>send</span>
                {submitting ? t("inquiry.sending") : t("inquiry.send")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PortalInquiryModal;
