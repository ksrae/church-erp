import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../App";
import {
  Resource,
  ResourceCategory,
  ResourceVisibility,
  RESOURCE_MAX_BYTES,
  resourceCategoryColors,
  resourceCategoryLabels,
  resourceVisibilityLabels,
} from "../types/resource";
import {
  deleteResource,
  formatFileSize,
  subscribeResources,
  updateResource,
  uploadResource,
} from "../utils/resources";
import { logActivity } from "../utils/auditLog";
import { useLocale } from "../i18n/LocaleContext";

const CATEGORY_ORDER: ResourceCategory[] = ["bulletin", "sermon", "education", "music", "other"];

function Resources() {
  const { auth } = useAuth();
  const { t, locale } = useLocale();
  const admin = auth.type === "church" ? auth.admin : null;
  const churchId = admin?.churchId;

  const categoryLabel = (c: ResourceCategory): string => {
    const key = `resources.category.${c}`;
    const translated = t(key as any);
    return translated === key ? resourceCategoryLabels[c] : translated;
  };
  const visibilityLabel = (v: ResourceVisibility): string => {
    const key = `resources.visibility.${v}`;
    const translated = t(key as any);
    return translated === key ? resourceVisibilityLabels[v] : translated;
  };

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<"all" | ResourceCategory>("all");
  const [filterVisibility, setFilterVisibility] = useState<"all" | ResourceVisibility>("all");
  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState<Resource | null>(null);

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    const unsub = subscribeResources(churchId, (rows) => {
      setResources(rows);
      setLoading(false);
    });
    return unsub;
  }, [churchId]);

  const filtered = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterVisibility !== "all" && r.visibility !== filterVisibility) return false;
      if (lowerSearch) {
        const hay = `${r.title} ${r.description || ""} ${r.fileName}`.toLowerCase();
        if (!hay.includes(lowerSearch)) return false;
      }
      return true;
    });
  }, [resources, filterCategory, filterVisibility, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: resources.length };
    for (const c of CATEGORY_ORDER) map[c] = 0;
    for (const r of resources) map[r.category] = (map[r.category] || 0) + 1;
    return map;
  }, [resources]);

  const handleDelete = async (r: Resource) => {
    if (!confirm(t("resources.deleteConfirm", { title: r.title }))) return;
    try {
      await deleteResource(r);
      await logActivity(
        "RESOURCES",
        t("resources.audit.deleteTitle"),
        t("resources.audit.deleteBody", { title: r.title }),
      );
    } catch (e) {
      console.error(e);
      alert(t("resources.deleteFailed"));
    }
  };

  const handleToggleVisibility = async (r: Resource) => {
    const next: ResourceVisibility = r.visibility === "public" ? "private" : "public";
    try {
      await updateResource(r.id, { visibility: next });
    } catch (e) {
      console.error(e);
      alert(t("resources.visibilityFailed"));
    }
  };

  if (!churchId) {
    return (
      <div className="page-content">
        <p>{t("resources.noChurch")}</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="page-header__title">{t("resources.pageTitle")}</h1>
            <p className="page-header__description">{t("resources.pageDescription")}</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowUpload(true)}>
            <span className="material-symbols-outlined">upload</span>
            {t("resources.upload")}
          </button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <CategoryChip
          active={filterCategory === "all"}
          label={t("resources.count", { label: t("resources.category.all"), n: counts.all })}
          color={{ bg: "#e0f2fe", text: "#0369a1" }}
          onClick={() => setFilterCategory("all")}
        />
        {CATEGORY_ORDER.map((c) => (
          <CategoryChip
            key={c}
            active={filterCategory === c}
            label={t("resources.count", { label: categoryLabel(c), n: counts[c] || 0 })}
            color={resourceCategoryColors[c]}
            onClick={() => setFilterCategory(c)}
          />
        ))}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input
          type="search"
          className="form-input"
          placeholder={t("resources.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "22rem" }}
        />
        <select
          className="form-select"
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value as typeof filterVisibility)}
          style={{ width: "auto" }}
        >
          <option value="all">{t("resources.filter.allVisibility")}</option>
          <option value="public">{t("resources.visibilityPublicOnly")}</option>
          <option value="private">{t("resources.visibilityPrivateOnly")}</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "2rem" }}>autorenew</span>
          <p>{t("resources.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>folder_open</span>
          <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{t("resources.empty")}</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>{t("resources.emptyHint")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              categoryLabel={categoryLabel}
              visibilityLabel={visibilityLabel}
              locale={locale}
              t={t}
              onEdit={() => setEditTarget(r)}
              onDelete={() => handleDelete(r)}
              onToggleVisibility={() => handleToggleVisibility(r)}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          churchId={churchId}
          uploaderUid={admin?.uid}
          uploaderName={admin?.displayName}
          onClose={() => setShowUpload(false)}
        />
      )}

      {editTarget && (
        <EditModal
          resource={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────────

function CategoryChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: { bg: string; text: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 0.875rem",
        borderRadius: "999px",
        border: active ? `1px solid ${color.text}` : "1px solid #e2e8f0",
        background: active ? color.bg : "white",
        color: active ? color.text : "#475569",
        fontWeight: active ? 700 : 500,
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  categoryLabel,
  visibilityLabel,
  locale,
  t,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  resource: Resource;
  categoryLabel: (c: ResourceCategory) => string;
  visibilityLabel: (v: ResourceVisibility) => string;
  locale: string;
  t: (key: any, vars?: Record<string, string | number>) => string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  const catColor = resourceCategoryColors[resource.category];
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "0.25rem 0.625rem",
            borderRadius: "999px",
            background: catColor.bg,
            color: catColor.text,
          }}
        >
          {categoryLabel(resource.category)}
        </span>
        <button
          onClick={onToggleVisibility}
          title={resource.visibility === "public" ? t("resources.toPrivate") : t("resources.toPublic")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            border: "1px solid #e2e8f0",
            background: resource.visibility === "public" ? "#ecfdf5" : "#f8fafc",
            color: resource.visibility === "public" ? "#047857" : "#475569",
            borderRadius: "999px",
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "0.25rem 0.625rem",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>
            {resource.visibility === "public" ? "public" : "lock"}
          </span>
          {visibilityLabel(resource.visibility)}
        </button>
      </div>

      <div>
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
          {resource.title}
        </h3>
        {resource.description && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, wordBreak: "break-word" }}>
            {resource.description}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "#64748b" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>description</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {resource.fileName}
        </span>
        <span>{formatFileSize(resource.fileSize)}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
        <span>{new Date(resource.uploadedAt).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")}</span>
        {resource.uploaderName && <span>{resource.uploaderName}</span>}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
        <a
          href={resource.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary"
          style={{ flex: 1, justifyContent: "center", fontSize: "0.82rem", textDecoration: "none" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>download</span>
          {t("resources.download")}
        </a>
        <button
          className="btn btn--secondary"
          onClick={onEdit}
          style={{ fontSize: "0.82rem" }}
          title={t("resources.editTitle")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>edit</span>
        </button>
        <button
          className="btn btn--secondary"
          onClick={onDelete}
          style={{ fontSize: "0.82rem", color: "#b91c1c" }}
          title={t("resources.deleteTitle")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Upload modal ────────────────────────────────────────────────────────────

function UploadModal({
  churchId,
  uploaderUid,
  uploaderName,
  onClose,
}: {
  churchId: string;
  uploaderUid?: string;
  uploaderName?: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const categoryLabel = (c: ResourceCategory): string => {
    const key = `resources.category.${c}`;
    const translated = t(key as any);
    return translated === key ? resourceCategoryLabels[c] : translated;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("bulletin");
  const [visibility, setVisibility] = useState<ResourceVisibility>("private");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > RESOURCE_MAX_BYTES) {
      setError(t("resources.err.fileTooLarge", { size: formatFileSize(f.size) }));
      e.target.value = "";
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError(t("resources.err.titleRequired")); return; }
    if (!file) { setError(t("resources.err.fileRequired")); return; }
    setError("");
    setUploading(true);
    try {
      await uploadResource({
        churchId,
        title,
        description,
        category,
        visibility,
        file,
        uploadedBy: uploaderUid,
        uploaderName,
      });
      await logActivity(
        "RESOURCES",
        t("resources.audit.uploadTitle"),
        t("resources.audit.uploadBody", { title }),
      );
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("resources.err.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell title={t("resources.modal.uploadTitle")} onClose={uploading ? () => {} : onClose}>
      <div className="form-group">
        <label className="form-label">{t("resources.field.title")} *</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("resources.field.titlePlaceholder")}
          disabled={uploading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t("resources.field.description")}</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("resources.field.descriptionPlaceholder")}
          disabled={uploading}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <div className="form-group">
          <label className="form-label">{t("resources.field.category")}</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as ResourceCategory)}
            disabled={uploading}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t("resources.field.visibility")}</label>
          <select
            className="form-select"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ResourceVisibility)}
            disabled={uploading}
          >
            <option value="private">{t("resources.field.visibilityPrivate")}</option>
            <option value="public">{t("resources.field.visibilityPublic")}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t("resources.field.file")}</label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "block", width: "100%" }}
        />
        {file && (
          <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.375rem" }}>
            {t("resources.fileSelected", { name: file.name, size: formatFileSize(file.size) })}
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button className="btn btn--secondary" onClick={onClose} disabled={uploading}>{t("common.cancel")}</button>
        <button className="btn btn--primary" onClick={handleSubmit} disabled={uploading}>
          {uploading ? t("resources.uploading") : t("resources.uploadBtn")}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Edit modal ──────────────────────────────────────────────────────────────

function EditModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const { t } = useLocale();
  const categoryLabel = (c: ResourceCategory): string => {
    const key = `resources.category.${c}`;
    const translated = t(key as any);
    return translated === key ? resourceCategoryLabels[c] : translated;
  };
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description || "");
  const [category, setCategory] = useState<ResourceCategory>(resource.category);
  const [visibility, setVisibility] = useState<ResourceVisibility>(resource.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError(t("resources.err.titleRequired")); return; }
    setError("");
    setSaving(true);
    try {
      await updateResource(resource.id, { title, description, category, visibility });
      onClose();
    } catch (e) {
      console.error(e);
      setError(t("resources.err.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={t("resources.modal.editTitle")} onClose={saving ? () => {} : onClose}>
      <div className="form-group">
        <label className="form-label">{t("resources.field.title")} *</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t("resources.field.description")}</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <div className="form-group">
          <label className="form-label">{t("resources.field.category")}</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as ResourceCategory)}
            disabled={saving}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t("resources.field.visibility")}</label>
          <select
            className="form-select"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ResourceVisibility)}
            disabled={saving}
          >
            <option value="private">{t("resources.field.visibilityPrivateShort")}</option>
            <option value="public">{t("resources.field.visibilityPublicShort")}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t("resources.field.fileOnly")}</label>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
          {t("resources.fileSizeInfo", { name: resource.fileName, size: formatFileSize(resource.fileSize) })}
        </p>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
          {t("resources.fileReplaceHint")}
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button className="btn btn--secondary" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t("resources.saving") : t("common.save")}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              display: "inline-flex",
              padding: "0.25rem",
            }}
            aria-label={t("resources.closeLabel")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Resources;
