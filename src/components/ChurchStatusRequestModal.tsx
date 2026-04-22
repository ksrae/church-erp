import { useState } from "react";
import { createStatusRequest } from "../utils/statusRequests";
import { StatusRequestContext, STATUS_REQUEST_CONTEXT_LABEL } from "../types/statusRequest";
import { useLocale } from "../i18n/LocaleContext";

interface Props {
  context: StatusRequestContext;
  churchId: string | null;
  churchName: string;
  requester: { uid: string; email: string; displayName: string };
  onClose: () => void;
  onSubmitted: () => void;
}

function ChurchStatusRequestModal({ context, churchId, churchName, requester, onClose, onSubmitted }: Props) {
  const { t } = useLocale();

  const contextLabel = (ctx: StatusRequestContext): string => {
    const key = `statusReq.context.${ctx}`;
    const translated = t(key as any);
    return translated === key ? STATUS_REQUEST_CONTEXT_LABEL[ctx] : translated;
  };

  const defaultSubject = (ctx: StatusRequestContext): string => {
    if (ctx === "hold") return t("statusReq.defaultSubject.hold");
    if (ctx === "suspended") return t("statusReq.defaultSubject.suspended");
    if (ctx === "deleted") return t("statusReq.defaultSubject.deleted");
    return "";
  };

  const [subject, setSubject] = useState(defaultSubject(context));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!subject.trim()) { setError(t("statusReq.err.subjectRequired")); return; }
    if (!message.trim()) { setError(t("statusReq.err.messageRequired")); return; }

    setSubmitting(true);
    try {
      await createStatusRequest({
        churchId,
        churchName: churchName || t("statusReq.churchUnknown"),
        context,
        requesterUid: requester.uid,
        requesterEmail: requester.email,
        requesterName: requester.displayName,
        subject: subject.trim(),
        message: message.trim(),
      });
      onSubmitted();
    } catch (e: any) {
      console.error(e);
      setError(t("statusReq.err.sendFailed"));
    } finally {
      setSubmitting(false);
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
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ padding: "1.125rem 1.375rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="material-symbols-outlined" style={{ color: "#16649c" }}>contact_support</span>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
            {t("statusReq.title")}
          </h3>
          <button
            onClick={() => !submitting && onClose()}
            style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ padding: "1.125rem 1.375rem" }}>
          <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "1rem", lineHeight: 1.55, background: "#f8fafc", padding: "0.75rem 0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>
              {t("statusReq.contextLabel")}: {contextLabel(context)}
            </p>
            {churchName && (
              <p style={{ margin: "0.25rem 0 0" }}>
                {t("statusReq.churchNameLabel")}: <strong>{churchName}</strong>
              </p>
            )}
          </div>

          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
              {t("statusReq.subjectLabel")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("statusReq.subjectPlaceholder")}
              style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.375rem" }}>
              {t("statusReq.messageLabel")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("statusReq.messagePlaceholder")}
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
              {submitting ? t("statusReq.sending") : t("statusReq.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChurchStatusRequestModal;
