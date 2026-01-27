import { useState, useEffect, useRef } from "react";
import { loadData, isTauriEnv } from "../../utils/fileStorage";
import { saveAdminData, loadAdminData, hashPassword } from "../../utils/adminSecurity";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import {
  AdminUser,
  AdminRole,
  AdminData,
  roleLabels,
} from "../../types/admin";

const MEMBERS_STORAGE_KEY = "church_erp_members";
const DEFAULT_ADMIN_ID = "admin-super-default";

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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("member");

  // Search state for member selection
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);




  // Tooltip state
  const [showDefaultTooltip, setShowDefaultTooltip] = useState(false);

  // Check permissions for UI rendering
  // If currentUser is null, we assume super access (e.g. initial setup or dev)
  const isSuperAdmin = !currentUser || currentUser.role === "super" || currentUser.username === "admin";
  const isFinanceAdmin = isSuperAdmin || currentUser.role === "finance";

  // Username validation state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameValid, setIsUsernameValid] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Create default super admin
  const createDefaultAdmin = async (): Promise<AdminData> => {
    const defaultPasswordHash = await hashPassword("admin");
    const defaultAdmin: AdminUser = {
      id: DEFAULT_ADMIN_ID,
      memberId: "",
      memberName: "시스템 관리자",
      username: "admin",
      passwordHash: defaultPasswordHash,
      role: "super",
      createdAt: new Date().toISOString(),
    };

    return {
      admins: [defaultAdmin],
      lastUpdated: new Date().toISOString(),
    };
  };

  const loadAllData = async () => {
    try {
      // Load members first - try file system, then localStorage fallback
      let memberData = await loadData<Member[]>("members");

      // Fallback to LocalStorage if file system failed
      if (!memberData || memberData.length === 0) {
        const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
        if (savedMembers) {
          memberData = JSON.parse(savedMembers);
          console.log("📦 Loaded members from localStorage fallback");
        }
      }

      if (memberData && memberData.length > 0) {
        setMembers(memberData);
        console.log(`✅ Loaded ${memberData.length} members`);
      } else {
        console.log("ℹ️ No members found");
      }

      // Load admins from secure binary file
      let adminData: AdminData | null = null;

      try {
        adminData = await loadAdminData<AdminData>();
      } catch (error) {
        console.error("❌ Admin file corrupted or invalid, resetting to default:", error);
        adminData = null;
      }

      // If no admin data or corrupted, create default super admin
      if (!adminData || !adminData.admins || adminData.admins.length === 0) {
        console.log("🔄 Initializing default admin account...");
        adminData = await createDefaultAdmin();
        await saveAdminData(adminData);
      }

      setAdmins(adminData.admins);
    } catch (e) {
      console.error("Failed to load data:", e);
      // Even on error, try to create default admin
      try {
        const adminData = await createDefaultAdmin();
        await saveAdminData(adminData);
        setAdmins(adminData.admins);
      } catch (err) {
        console.error("Failed to create default admin:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveAdmins = async (newAdmins: AdminUser[]) => {
    const data: AdminData = {
      admins: newAdmins,
      lastUpdated: new Date().toISOString(),
    };
    await saveAdminData(data);
    setAdmins(newAdmins);
  };

  const openAddModal = () => {
    setEditingAdmin(null);
    setSelectedMemberId("");
    setUsername("");
    setPassword("");

    // Set default role to the highest permission available to the user
    // This UX prevents the misconception that only "member" role is available
    if (isSuperAdmin) {
      setRole("super");
    } else if (isFinanceAdmin) {
      setRole("finance");
    } else {
      setRole("member");
    }

    setMemberSearch("");
    setUsernameError(null);
    setIsUsernameValid(false);
    setModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setSelectedMemberId(admin.memberId || "");
    setUsername(admin.username);
    setPassword(""); // Don't show existing password
    setRole(admin.role);
    setMemberSearch(admin.memberName || "");
    setShowMemberDropdown(false);

    setUsernameError(null);
    setIsUsernameValid(true); // Existing username is initially valid

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAdmin(null);
    setMemberSearch("");
    setShowMemberDropdown(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!username.trim()) {
      setUsernameError("아이디를 입력해주세요.");
      return;
    }

    // Check username uniqueness (except for current editing admin)
    const existingUsername = admins.find(
      (a) => a.username === username && a.id !== editingAdmin?.id
    );
    if (existingUsername) {
      setUsernameError("이미 사용 중인 아이디입니다.");
      setIsUsernameValid(false);
      return;
    }

    if (!editingAdmin && !password.trim()) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    // Member is required for ALL roles (except maybe initial setup, but UI enforces it)
    if (!selectedMemberId) {
      alert("연결할 성도를 반드시 선택해야 합니다.");
      return;
    }

    const selectedMember = members.find((m) => m.id === selectedMemberId);

    if (editingAdmin) {
      // Update existing admin
      let newPasswordHash = editingAdmin.passwordHash;
      if (password.trim()) {
        newPasswordHash = await hashPassword(password);
      }

      const updatedAdmins = admins.map((a) =>
        a.id === editingAdmin.id
          ? {
            ...a,
            memberId: selectedMemberId,
            memberName: selectedMember?.name || (role === "super" ? "시스템 관리자" : a.memberName),
            username,
            passwordHash: newPasswordHash,
            role,
          }
          : a
      );
      await saveAdmins(updatedAdmins);
    } else {
      // Add new admin
      const passwordHash = await hashPassword(password);

      const newAdmin: AdminUser = {
        id: `admin-${Date.now()}`,
        memberId: selectedMemberId,
        memberName: selectedMember?.name || (role === "super" ? "시스템 관리자" : "알 수 없음"),
        username,
        passwordHash,
        role,
        createdAt: new Date().toISOString(),
      };
      await saveAdmins([...admins, newAdmin]);
    }

    closeModal();
  };

  const handleDelete = async (adminId: string) => {
    // Prevent deleting default super admin
    if (adminId === DEFAULT_ADMIN_ID) {
      alert("기본 슈퍼 관리자는 삭제할 수 없습니다.");
      setDeleteConfirm(null);
      return;
    }

    const updatedAdmins = admins.filter((a) => a.id !== adminId);
    await saveAdmins(updatedAdmins);
    setDeleteConfirm(null);
  };

  const selectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setMemberSearch(member.name);
    setShowMemberDropdown(false);
  };

  // Get image source for member
  const getMemberImageSrc = (member: Member): string | null => {
    if (!member.profileImage) return null;

    if (member.profileImage.startsWith("data:") || member.profileImage.startsWith("http")) {
      return member.profileImage;
    }

    if (isTauriEnv()) {
      return convertFileSrc(member.profileImage);
    }

    return member.profileImage;
  };

  // Filter members by search, excluding those already linked to other admins
  const usedMemberIds = new Set(
    admins
      .filter(a => a.memberId && a.id !== editingAdmin?.id)
      .map(a => a.memberId)
  );

  const filteredMembers = members.filter(
    (m) =>
      !usedMemberIds.has(m.id) &&
      (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.phone && m.phone.includes(memberSearch)) ||
        (m.zone && m.zone.toLowerCase().includes(memberSearch.toLowerCase())))
  );

  // Check if member selection is required
  // Check if member selection is required


  if (isLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="admin-management">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>관리자 계정</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            시스템에 접근할 수 있는 관리자를 관리합니다. (암호화 저장)
          </p>
        </div>
        <button className="btn btn--primary" onClick={openAddModal}>
          <span className="material-symbols-outlined">person_add</span>
          관리자 추가
        </button>
      </div>

      {/* Admin List */}
      <div className="form-card" style={{ padding: 0 }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>아이디</th>
              <th>연결된 성도</th>
              <th>권한</th>
              <th>생성일</th>
              <th>마지막 로그인</th>
              <th style={{ width: "100px", textAlign: "center" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <strong style={{ textTransform: "none" }}>{admin.username}</strong>
                  {admin.id === DEFAULT_ADMIN_ID && (
                    <span
                      style={{
                        color: "var(--primary)",
                        marginLeft: "4px",
                        cursor: "help",
                        position: "relative",
                        display: "inline-block",
                      }}
                      onMouseEnter={() => setShowDefaultTooltip(true)}
                      onMouseLeave={() => setShowDefaultTooltip(false)}
                    >
                      *
                      {showDefaultTooltip && (
                        <span
                          style={{
                            position: "absolute",
                            left: "100%",
                            top: "50%",
                            transform: "translateY(-50%)",
                            marginLeft: "8px",
                            padding: "6px 10px",
                            background: "rgba(0, 0, 0, 0.85)",
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: "normal",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            zIndex: 1000,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                          }}
                        >
                          기본 관리자
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td>{admin.memberName || "-"}</td>
                <td>
                  <span className={`status-badge status-badge--${admin.role === "super" ? "registered" : admin.role === "finance" ? "visitor" : "moved"}`}>
                    {roleLabels[admin.role]}
                  </span>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {new Date(admin.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString("ko-KR") : "-"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                    <button
                      onClick={() => openEditModal(admin)}
                      disabled={!isSuperAdmin && currentUser?.role !== admin.role}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: (!isSuperAdmin && currentUser?.role !== admin.role) ? "not-allowed" : "pointer",
                        padding: "4px",
                        opacity: (!isSuperAdmin && currentUser?.role !== admin.role) ? 0.3 : 1
                      }}
                      title="수정"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--text-secondary)" }}>
                        edit
                      </span>
                    </button>
                    {admin.id !== DEFAULT_ADMIN_ID && (
                      <button
                        onClick={() => setDeleteConfirm(admin.id)}
                        disabled={!isSuperAdmin && currentUser?.role !== admin.role}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: (!isSuperAdmin && currentUser?.role !== admin.role) ? "not-allowed" : "pointer",
                          padding: "4px",
                          opacity: (!isSuperAdmin && currentUser?.role !== admin.role) ? 0.3 : 1
                        }}
                        title="삭제"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--danger)" }}>
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {admins.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "3rem", marginBottom: "0.5rem", display: "block" }}>
              admin_panel_settings
            </span>
            <p>등록된 관리자가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: "500px" }}>
            <div className="modal__header">
              <h3 className="modal__title">
                {editingAdmin ? "관리자 수정" : "관리자 추가"}
              </h3>
              <button className="modal__close" onClick={closeModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal__content">
              {/* Role - Move to top so user knows member requirement */}
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label className="form-label">권한 *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {/* Super Admin Radio */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      border: `1px solid ${role === "super" ? "var(--primary)" : "var(--border-color)"}`,
                      borderRadius: "6px",
                      background: role === "super" ? "var(--info-bg)" : "white",
                      cursor: isSuperAdmin ? "pointer" : "not-allowed",
                      opacity: isSuperAdmin ? 1 : 0.5
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="super"
                      checked={role === "super"}
                      onChange={() => setRole("super")}
                      disabled={!isSuperAdmin}
                    />
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      슈퍼 관리자
                      {!isSuperAdmin && <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginLeft: "6px" }}>(권한 없음)</span>}
                    </div>
                  </label>

                  {/* Finance Admin Radio */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      border: `1px solid ${role === "finance" ? "var(--primary)" : "var(--border-color)"}`,
                      borderRadius: "6px",
                      background: role === "finance" ? "var(--info-bg)" : "white",
                      cursor: isFinanceAdmin ? "pointer" : "not-allowed",
                      opacity: isFinanceAdmin ? 1 : 0.5
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="finance"
                      checked={role === "finance"}
                      onChange={() => setRole("finance")}
                      disabled={!isFinanceAdmin}
                    />
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      재정 관리자
                      {!isFinanceAdmin && <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginLeft: "6px" }}>(권한 없음)</span>}
                    </div>
                  </label>

                  {/* Member Admin Radio */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      border: `1px solid ${role === "member" ? "var(--primary)" : "var(--border-color)"}`,
                      borderRadius: "6px",
                      background: role === "member" ? "var(--info-bg)" : "white",
                      cursor: (isSuperAdmin || currentUser?.role === "member") ? "pointer" : "not-allowed",
                      opacity: (isSuperAdmin || currentUser?.role === "member") ? 1 : 0.5
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={role === "member"}
                      onChange={() => setRole("member")}
                      disabled={!isSuperAdmin && currentUser?.role !== "member"}
                    />
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      성도 관리자
                      {(!isSuperAdmin && currentUser?.role !== "member") && <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginLeft: "6px" }}>(권한 없음)</span>}
                    </div>
                  </label>
                </div>



              </div>

              {/* Member Selection with Search */}
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label className="form-label">
                  연결할 성도 <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        position: "absolute",
                        left: "12px",
                        color: "var(--text-muted)",
                        fontSize: "20px",
                        pointerEvents: "none",
                        zIndex: 2
                      }}
                    >
                      search
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      style={{
                        paddingLeft: "2.75rem",
                        paddingRight: "3rem",
                        height: "44px",
                        fontSize: "0.9375rem",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                        transition: "all 0.2s"
                      }}
                      placeholder="성도 이름, 연락처, 소속으로 검색..."
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setShowMemberDropdown(true);
                        if (!e.target.value) setSelectedMemberId("");
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                    />
                    <div
                      onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                      style={{
                        position: "absolute",
                        right: "0",
                        top: "0",
                        bottom: "0",
                        width: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        borderLeft: "1px solid var(--border-color)",
                        background: "rgba(0,0,0,0.02)",
                        borderTopRightRadius: "10px",
                        borderBottomRightRadius: "10px",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          transform: showMemberDropdown ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s"
                        }}
                      >
                        expand_more
                      </span>
                    </div>
                  </div>

                  {showMemberDropdown && (
                    <div
                      className="animate-scaleIn"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        width: "100%",
                        maxHeight: "280px",
                        overflowY: "auto",
                        background: "white",
                        border: "1px solid var(--border-color)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        padding: "6px"
                      }}
                    >
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map(member => (
                          <div
                            key={member.id}
                            onClick={() => selectMember(member)}
                            style={{
                              padding: "0.75rem 1rem",
                              cursor: "pointer",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "1rem",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--info-bg)";
                              e.currentTarget.style.transform = "translateX(4px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.transform = "translateX(0)";
                            }}
                          >
                            {/* Image/Avatar */}
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "1px solid #e2e8f0"
                              }}
                            >
                              {getMemberImageSrc(member) ? (
                                <img
                                  src={getMemberImageSrc(member)!}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#94a3b8" }}>person</span>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9375rem" }}>
                                {member.name}
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "normal", marginLeft: "6px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                  성도
                                </span>
                              </div>
                              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                {member.phone || "연락처 없음"} {member.zone ? ` · ${member.zone}` : ""}
                              </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#cbd5e1" }}>chevron_right</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: "#e2e8f0", marginBottom: "0.5rem" }}>search_off</span>
                          <p style={{ fontSize: "0.875rem" }}>검색 결과가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedMemberId && (
                  <div className="animate-fadeIn" style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "var(--success-bg)",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(34, 197, 94, 0.2)"
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px", background: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }}>
                      <span className="material-symbols-outlined" style={{ color: "var(--success)", fontSize: "20px" }}>check_circle</span>
                    </div>
                    <span style={{ fontSize: "0.875rem", color: "#166534" }}>
                      현재 선택된 성도: <strong>{members.find(m => m.id === selectedMemberId)?.name}</strong>
                    </span>
                    <button
                      onClick={() => { setSelectedMemberId(""); setMemberSearch(""); }}
                      style={{
                        background: "white", border: "1px solid #e2e8f0", cursor: "pointer",
                        padding: "4px", borderRadius: "6px", marginLeft: "auto",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "inherit"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                    </button>
                  </div>
                )}
                {!selectedMemberId && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span>
                    권한 부여를 위해 반드시 성도를 연결해야 합니다.
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label className="form-label">아이디 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="로그인 아이디"
                  value={username}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                    setIsUsernameValid(false);
                  }}
                  onBlur={() => {
                    if (!username.trim()) {
                      setUsernameError("아이디를 입력해주세요.");
                      setIsUsernameValid(false);
                      return;
                    }
                    const isDuplicate = admins.some(a => a.username === username && a.id !== editingAdmin?.id);
                    if (isDuplicate) {
                      setUsernameError("이미 사용 중인 아이디입니다.");
                      setIsUsernameValid(false);
                    } else {
                      setUsernameError(null);
                      setIsUsernameValid(true);
                    }
                  }}
                  style={{
                    borderColor: usernameError ? "var(--danger)" : isUsernameValid ? "var(--success)" : "var(--border-color)",
                  }}
                />
                {usernameError && (
                  <p style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "4px" }}>
                    {usernameError}
                  </p>
                )}
                {!usernameError && isUsernameValid && username && (
                  <p style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "4px" }}>
                    사용 가능한 아이디입니다.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label className="form-label">
                  비밀번호 {editingAdmin ? "(변경 시에만 입력)" : "*"}
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={editingAdmin ? "새 비밀번호 (선택사항)" : "비밀번호"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  비밀번호는 암호화되어 저장됩니다.
                </p>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={closeModal}>
                취소
              </button>
              <button className="btn btn--primary" onClick={handleSubmit}>
                {editingAdmin ? "저장" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ width: "400px" }}>
              <div className="modal__header">
                <h3 className="modal__title" style={{ color: "var(--danger)" }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: "bottom", marginRight: "8px" }}>
                    warning
                  </span>
                  관리자 삭제
                </h3>
                <button className="modal__close" onClick={() => setDeleteConfirm(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="modal__content">
                <p style={{ margin: "1rem 0" }}>
                  이 관리자를 삭제하시겠습니까?
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  삭제된 관리자는 더 이상 시스템에 로그인할 수 없습니다.
                </p>
              </div>
              <div className="modal__footer">
                <button className="btn btn--outline" onClick={() => setDeleteConfirm(null)}>
                  취소
                </button>
                <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default AdminManagement;
