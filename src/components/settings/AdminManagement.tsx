import { useState, useEffect } from "react";
import { loadData } from "../../utils/fileStorage";
import { loadAllAdmins, saveAdminUser, deleteAdminUser, AdminUser } from "../../utils/adminSecurity";
import { AdminRole, roleLabels } from "../../types/admin";

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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 새 관리자 초대 폼
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("member");
  const [inviteMemberId, setInviteMemberId] = useState("");
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { alert("이메일을 입력해주세요."); return; }
    // 초대된 사용자는 다음 번 구글 로그인 때 자동으로 admin으로 등록됨
    // 여기서는 Firestore에 "초대된 이메일" 레코드를 미리 만들어 놓는 방식
    setIsSaving(true);
    try {
      const newAdmin: AdminUser = {
        id: `invited-${Date.now()}`,  // 실제 구글 로그인 시 UID로 교체됨
        email: inviteEmail.trim().toLowerCase(),
        displayName: inviteMemberName || inviteEmail.split("@")[0],
        memberId: inviteMemberId,
        memberName: inviteMemberName,
        username: inviteEmail.split("@")[0],
        role: inviteRole,
        createdAt: new Date().toISOString(),
      };
      await saveAdminUser(newAdmin);
      setAdmins((prev) => [...prev, newAdmin]);
      setInviteEmail("");
      setInviteRole("member");
      setInviteMemberId("");
      setInviteMemberName("");
      alert("관리자가 등록되었습니다. 해당 구글 계정으로 로그인하면 자동 연결됩니다.");
    } catch (e: any) {
      alert(`등록 실패: ${e.message}`);
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
      alert(`저장 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (adminId === currentUser?.id) { alert("자기 자신은 삭제할 수 없습니다."); return; }
    try {
      await deleteAdminUser(adminId);
      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>관리자 계정</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            구글 계정으로 로그인하는 관리자를 관리합니다.
          </p>
        </div>
      </div>

      {/* 관리자 목록 */}
      <div className="form-card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>권한</th>
              <th>마지막 로그인</th>
              {isSuperAdmin && <th style={{ width: "80px", textAlign: "center" }}>관리</th>}
            </tr>
          </thead>
          <tbody>
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
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", background: "#eff6ff", color: "#16649c", borderRadius: "10px" }}>나</span>
                    )}
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{admin.email}</td>
                <td>
                  <span className={`status-badge status-badge--${admin.role === "super" ? "registered" : admin.role === "finance" ? "visitor" : "moved"}`}>
                    {roleLabels[admin.role]}
                  </span>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString("ko-KR") : "-"}
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

      {/* 새 관리자 초대 (슈퍼 관리자만) */}
      {isSuperAdmin && (
        <div className="form-card">
          <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>관리자 추가</h4>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            추가할 관리자의 구글 이메일을 등록하세요. 해당 계정으로 구글 로그인 시 자동으로 접근 권한이 부여됩니다.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">구글 이메일 *</label>
              <input type="email" className="form-input" placeholder="example@gmail.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">권한</label>
              <select className="form-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as AdminRole)}>
                <option value="super">슈퍼 관리자</option>
                <option value="finance">재정 관리자</option>
                <option value="member">성도 관리자</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">표시 이름</label>
              <input type="text" className="form-input" placeholder="홍길동" value={inviteMemberName} onChange={(e) => setInviteMemberName(e.target.value)} />
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn--primary" onClick={handleInvite} disabled={isSaving} style={{ width: "100%" }}>
                <span className="material-symbols-outlined">person_add</span>
                {isSaving ? "등록 중..." : "관리자 등록"}
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
              <h3 className="modal__title">관리자 권한 수정</h3>
              <button className="modal__close" onClick={closeModal}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                {editingAdmin.email}
              </p>
              <div className="form-group">
                <label className="form-label">권한</label>
                <select className="form-select" value={editRole} onChange={(e) => setEditRole(e.target.value as AdminRole)}>
                  <option value="super">슈퍼 관리자</option>
                  <option value="finance">재정 관리자</option>
                  <option value="member">성도 관리자</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">표시 이름</label>
                <input type="text" className="form-input" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={closeModal}>취소</button>
              <button className="btn btn--primary" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "저장 중..." : "저장"}
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
                관리자 삭제
              </h3>
              <button className="modal__close" onClick={() => setDeleteConfirm(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <p>이 관리자를 삭제하시겠습니까?</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>삭제된 계정은 더 이상 로그인할 수 없습니다.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setDeleteConfirm(null)}>취소</button>
              <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagement;
