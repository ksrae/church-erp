import { useState, useEffect } from "react";
import { loadData } from "../../utils/fileStorage";
import { loadAllAdmins, saveAdminUser, deleteAdminUser, AdminUser } from "../../utils/adminSecurity";
import { AdminRole, roleLabels } from "../../types/admin";
import { useLocale } from "../../i18n/LocaleContext";

interface AdminManagementProps {
  currentUser?: AdminUser | null;
}

interface Member {
  id: string;
  name: string;
  phone?: string;
  zone?: string;
  profileImage?: string;
}

function AdminManagement({ currentUser }: AdminManagementProps) {
  const { t, locale } = useLocale();
  const dateLocale = locale === "ko" ? "ko-KR" : "en-US";

  const roleLabel = (role: AdminRole): string => {
    const key = `role.${role}`;
    const translated = t(key as any);
    return translated === key ? roleLabels[role] : translated;
  };

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 새 관리자 초대 폼
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("member");
  const [inviteMemberName, setInviteMemberName] = useState("");

  // 역할 수정 폼
  const [editRole, setEditRole] = useState<AdminRole>("member");
  const [editMemberId, setEditMemberId] = useState("");
  const [editMemberName, setEditMemberName] = useState("");

  const isSuperAdmin = currentUser?.role === "super";

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [adminList, memberData] = await Promise.all([
        loadAllAdmins(),
        loadData<Member[]>("members"),
      ]);
      setAdmins(adminList);
      if (memberData) setMembers(memberData);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditRole(admin.role);
    setEditMemberId(admin.memberId || "");
    setEditMemberName(admin.memberName || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAdmin(null);
  };

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteMemberName("");
    setInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    if (isSaving) return;
    setInviteModalOpen(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { alert(t("adminMgmt.err.emailRequired")); return; }
    // 초대된 사용자는 다음 번 구글 로그인 때 자동으로 admin으로 등록됨
    // 여기서는 Firestore에 "초대된 이메일" 레코드를 미리 만들어 놓는 방식
    setIsSaving(true);
    try {
      const newAdmin: AdminUser = {
        id: `invited-${Date.now()}`,  // 실제 구글 로그인 시 UID로 교체됨
        email: inviteEmail.trim().toLowerCase(),
        displayName: inviteMemberName || inviteEmail.split("@")[0],
        memberId: "",
        memberName: inviteMemberName,
        username: inviteEmail.split("@")[0],
        role: inviteRole,
        createdAt: new Date().toISOString(),
      };
      await saveAdminUser(newAdmin);
      setAdmins((prev) => [...prev, newAdmin]);
      setInviteModalOpen(false);
      alert(t("adminMgmt.success.registered"));
    } catch (e: any) {
      alert(t("adminMgmt.err.registerFailed", { msg: e.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) return;
    setIsSaving(true);
    try {
      const updated: AdminUser = {
        ...editingAdmin,
        role: editRole,
        memberId: editMemberId,
        memberName: editMemberName,
      };
      await saveAdminUser(updated);
      setAdmins((prev) => prev.map((a) => (a.id === editingAdmin.id ? updated : a)));
      closeModal();
    } catch (e: any) {
      alert(t("adminMgmt.err.saveFailed", { msg: e.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (adminId === currentUser?.id) { alert(t("adminMgmt.err.deleteSelf")); return; }
    try {
      await deleteAdminUser(adminId);
      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
    } catch (e: any) {
      alert(t("adminMgmt.err.deleteFailed", { msg: e.message }));
    }
    setDeleteConfirm(null);
  };

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{t("adminMgmt.loading")}</div>;

  const columnCount = isSuperAdmin ? 5 : 4;

  return (
    <div>
      <div className="settings-section__header-row">
        <div>
          <h2 className="settings-section__title">
            <span className="material-symbols-outlined">admin_panel_settings</span>
            {t("adminMgmt.title")}
          </h2>
          <p className="settings-section__description">
            {t("adminMgmt.description")}
          </p>
        </div>
        {isSuperAdmin && (
          <button className="settings-btn settings-btn--primary" onClick={openInviteModal}>
            <span className="material-symbols-outlined">person_add</span>
            {t("adminMgmt.register")}
          </button>
        )}
      </div>

      {/* 관리자 목록 */}
      <div className="form-card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>{t("adminMgmt.col.name")}</th>
              <th>{t("adminMgmt.col.email")}</th>
              <th>{t("adminMgmt.col.role")}</th>
              <th>{t("adminMgmt.col.lastLogin")}</th>
              {isSuperAdmin && <th style={{ width: "80px", textAlign: "center" }}>{t("adminMgmt.col.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="table-empty">{t("adminMgmt.empty")}</td>
              </tr>
            )}
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    {admin.photoURL ? (
                      <img src={admin.photoURL} alt="" style={{ width: "2rem", height: "2rem", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.875rem", fontWeight: 700 }}>
                        {(admin.displayName || admin.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontWeight: 600 }}>{admin.displayName || admin.email}</span>
                    {admin.id === currentUser?.id && (
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", background: "#eff6ff", color: "#16649c", borderRadius: "10px" }}>{t("adminMgmt.selfBadge")}</span>
                    )}
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{admin.email}</td>
                <td>
                  <span className={`status-badge status-badge--${admin.role === "super" ? "registered" : admin.role === "finance" ? "visitor" : "moved"}`}>
                    {roleLabel(admin.role)}
                  </span>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString(dateLocale) : "-"}
                </td>
                {isSuperAdmin && (
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                      <button onClick={() => openEditModal(admin)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "var(--text-secondary)" }}>edit</span>
                      </button>
                      {admin.id !== currentUser?.id && (
                        <button onClick={() => setDeleteConfirm(admin.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "var(--danger)" }}>delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 관리자 등록 모달 */}
      {inviteModalOpen && (
        <div className="modal-overlay" onClick={closeInviteModal}>
          <div className="modal" style={{ width: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">{t("adminMgmt.invite.title")}</h3>
              <button className="modal__close" onClick={closeInviteModal}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 1rem", lineHeight: 1.55 }}>
                {t("adminMgmt.invite.description")}
              </p>

              <div className="form-group">
                <label className="form-label">{t("adminMgmt.invite.emailLabel")} *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder={t("adminMgmt.invite.emailPlaceholder")}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("adminMgmt.invite.roleLabel")}</label>
                <select
                  className="form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  disabled={isSaving}
                >
                  <option value="super">{roleLabel("super")}</option>
                  <option value="finance">{roleLabel("finance")}</option>
                  <option value="member">{roleLabel("member")}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t("adminMgmt.invite.displayNameLabel")}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t("adminMgmt.invite.displayNamePlaceholder")}
                  value={inviteMemberName}
                  onChange={(e) => setInviteMemberName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={closeInviteModal} disabled={isSaving}>{t("common.cancel")}</button>
              <button className="btn btn--primary" onClick={handleInvite} disabled={isSaving}>
                {isSaving ? t("adminMgmt.invite.submitting") : t("adminMgmt.invite.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 역할 수정 모달 */}
      {modalOpen && editingAdmin && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: "420px" }}>
            <div className="modal__header">
              <h3 className="modal__title">{t("adminMgmt.edit.title")}</h3>
              <button className="modal__close" onClick={closeModal}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                {editingAdmin.email}
              </p>
              <div className="form-group">
                <label className="form-label">{t("adminMgmt.invite.roleLabel")}</label>
                <select className="form-select" value={editRole} onChange={(e) => setEditRole(e.target.value as AdminRole)}>
                  <option value="super">{roleLabel("super")}</option>
                  <option value="finance">{roleLabel("finance")}</option>
                  <option value="member">{roleLabel("member")}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("adminMgmt.invite.displayNameLabel")}</label>
                <input type="text" className="form-input" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={closeModal}>{t("common.cancel")}</button>
              <button className="btn btn--primary" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? t("adminMgmt.edit.saving") : t("adminMgmt.edit.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: "380px" }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: "var(--danger)" }}>
                <span className="material-symbols-outlined" style={{ verticalAlign: "bottom", marginRight: "6px" }}>warning</span>
                {t("adminMgmt.delete.title")}
              </h3>
              <button className="modal__close" onClick={() => setDeleteConfirm(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <p>{t("adminMgmt.delete.body")}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>{t("adminMgmt.delete.warning")}</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setDeleteConfirm(null)}>{t("common.cancel")}</button>
              <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>{t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagement;
