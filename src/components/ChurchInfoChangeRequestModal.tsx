import { useState } from "react";
import { Church } from "../types/church";
import {
  ChurchChangeRequestItem,
  ChurchInfoField,
  CHURCH_INFO_FIELD_LABEL,
} from "../types/changeRequest";
import { createChangeRequest } from "../utils/changeRequests";
import { useLocale } from "../i18n/LocaleContext";

interface Props {
  church: Church;
  requester: { uid: string; email: string; displayName: string };
  onClose: () => void;
  onSubmitted: () => void;
}

const ALL_FIELDS: ChurchInfoField[] = ["name", "pastorName", "email", "phone", "address", "foundedYear"];

function getCurrentValue(church: Church, field: ChurchInfoField): string {
  switch (field) {
    case "name": return church.name || "";
    case "pastorName": return church.pastorName || "";
    case "email": return church.email || "";
    case "phone": return church.phone || "";
    case "address": return church.address || "";
    case "foundedYear": return "";
  }
}

function ChurchInfoChangeRequestModal({ church, requester, onClose, onSubmitted }: Props) {
  const { t } = useLocale();

  const fieldLabel = (f: ChurchInfoField): string => {
    const key = `churchInfoField.${f}`;
    const translated = t(key as any);
    return translated === key ? CHURCH_INFO_FIELD_LABEL[f] : translated;
  };

  const [selected, setSelected] = useState<Set<ChurchInfoField>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggle = (field: ChurchInfoField) => {
    const next = new Set(selected);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    setSelected(next);
  };

  const submit = async () => {
    setError("");
    if (selected.size === 0) { setError(t("changeReq.err.selectAtLeastOne")); return; }
    if (!reason.trim()) { setError(t("changeReq.err.reasonRequired")); return; }

    const items: ChurchChangeRequestItem[] = [];
    for (const field of selected) {
      const requestedValue = (values[field] ?? "").trim();
      if (!requestedValue) { setError(t("changeReq.err.valueRequired", { field: fieldLabel(field) })); return; }
      items.push({ field, currentValue: getCurrentValue(church, field), requestedValue });
    }

    setSubmitting(true);
    try {
      await createChangeRequest({
        churchId: church.id,
        churchName: church.name,
        requesterUid: requester.uid,
        requesterEmail: requester.email,
        requesterName: requester.displayName,
        items,
        reason: reason.trim(),
      });
      onSubmitted();
    } catch (e: any) {
      console.error(e);
      setError(t("changeReq.err.sendFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "14px", width: "100%", maxWidth: "620px",
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="material-symbols-outlined" style={{ color: "#16649c" }}>edit_note</span>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{t("changeReq.title")}</h3>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "#475569", margin: "0 0 1rem", lineHeight: 1.6 }}>
            {t("changeReq.description")}
          </p>

          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", margin: "0 0 0.5rem" }}>{t("changeReq.selectFields")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {ALL_FIELDS.map((f) => {
                const checked = selected.has(f);
                const current = getCurrentValue(church, f);
                return (
                  <div key={f} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 0.875rem", background: checked ? "#f0f9ff" : "white" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(f)} />
                      {fieldLabel(f)}
                    </label>
                    {checked && (
                      <div style={{ marginTop: "0.625rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>{t("changeReq.currentValue")}</label>
                          <input value={current} readOnly style={{ width: "100%", padding: "0.5rem 0.6rem", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.85rem", background: "#f8fafc", color: "#64748b", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>{t("changeReq.requestedValue")}</label>
                          <input
                            value={values[f] ?? ""}
                            onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                            placeholder={t("changeReq.newValuePlaceholder")}
                            style={{ width: "100%", padding: "0.5rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.5rem" }}>{t("changeReq.reasonLabel")} <span style={{ color: "#ef4444" }}>*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("changeReq.reasonPlaceholder")}
              rows={4}
              style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.625rem 0.875rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{ padding: "0.625rem 1.125rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", color: "#334155", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              style={{ padding: "0.625rem 1.125rem", border: "none", borderRadius: "8px", background: "#16649c", color: "white", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>send</span>
              {submitting ? t("changeReq.sending") : t("changeReq.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChurchInfoChangeRequestModal;
