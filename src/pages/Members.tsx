import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { loadData, saveData } from "../utils/fileStorage";
import { LayoutOutletContext } from "../components/Layout";

const MEMBERS_STORAGE_KEY = "church_erp_members";
const VIEW_STATE_KEY = "church_erp_members_view_state";

interface Member {
  id: string;
  name: string;
  role: string;
  phone: string;
  zone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  joinDate?: string;
  profileImage?: string;
  status?: string;
  baptism?: string;
  familyHead?: string;
  moveDate?: string;
}

interface OrgGroup {
  id: string;
  name: string;
  count: number;
  expanded: boolean;
  children: { id: string; name: string; active: boolean }[];
}

function Members() {
  const navigate = useNavigate();
  const { currentUser } = useOutletContext<LayoutOutletContext>();
  const canEditOrg = currentUser?.role === "super" || currentUser?.role === "member";
  const [editMode, setEditMode] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgTree, setOrgTree] = useState<OrgGroup[]>([]);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "add_group" | "edit_group" | "add_zone" | "edit_zone";
    targetId?: string;
    parentId?: string; // For adding zone to a group
    initialValue?: string;
  }>({
    isOpen: false,
    type: "add_group",
  });
  const [modalInput, setModalInput] = useState("");

  const DEFAULT_ORG_TREE: OrgGroup[] = [
    {
      id: "1",
      name: "1교구",
      count: 0,
      expanded: true,
      children: [
        { id: "1-1", name: "1-1 구역", active: true },
        { id: "1-2", name: "1-2 구역", active: false },
        { id: "1-3", name: "1-3 구역", active: false },
      ],
    },
    { id: "2", name: "2교구", count: 0, expanded: false, children: [] },
    { id: "3", name: "청년부", count: 0, expanded: false, children: [] },
    { id: "4", name: "주일학교", count: 0, expanded: false, children: [] },
  ];

  // Initialize state from LocalStorage
  const [selectedZone, setSelectedZone] = useState(() => {
    const saved = localStorage.getItem(VIEW_STATE_KEY);
    return saved ? JSON.parse(saved).zone : "1-1 구역";
  });
  const [showAllMembers, setShowAllMembers] = useState(() => {
    const saved = localStorage.getItem(VIEW_STATE_KEY);
    // User requested default is All Members (true) if nothing saved
    return saved ? JSON.parse(saved).showAll : true;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "member_bulk" | "group" | "zone" | null;
    targetId?: string; // for group/zone
    parentId?: string; // for zone
    count?: number; // for bulk deletion
  }>({
    isOpen: false,
    type: null
  });

  // Persist View State
  useEffect(() => {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ showAll: showAllMembers, zone: selectedZone }));
  }, [showAllMembers, selectedZone]);

  // Validate Zone & Sync Tree UI
  useEffect(() => {
    if (orgTree.length === 0) return;

    if (!showAllMembers) {
      // Check if current selectedZone exists in tree
      let foundGroup = null;
      let foundZone = false;

      for (const group of orgTree) {
        if (group.children.some(c => c.name === selectedZone)) {
          foundGroup = group;
          foundZone = true;
          break;
        }
      }

      if (!foundZone) {
        // Invalid zone -> Fallback to Show All
        setShowAllMembers(true);
      } else if (foundGroup) {
        // Sync UI: Ensure parent expanded and child active
        // Only update if state doesn't match to avoid loops
        const groupNeedsExpand = !foundGroup.expanded;
        const childNeedsActive = foundGroup.children.find(c => c.name === selectedZone && !c.active);

        if (groupNeedsExpand || childNeedsActive) {
          setOrgTree(prev => prev.map(g => {
            if (g.id === foundGroup!.id) {
              return {
                ...g,
                expanded: true,
                children: g.children.map(c => ({
                  ...c,
                  active: c.name === selectedZone
                }))
              };
            }
            // Clear other active states?
            return {
              ...g,
              children: g.children.map(c => ({ ...c, active: false }))
            };
          }));
        }
      }
    } else {
      // Show All Mode: Clear active selections in tree
      const hasActive = orgTree.some(g => g.children.some(c => c.active));
      if (hasActive) {
        setOrgTree(prev => prev.map(g => ({
          ...g,
          children: g.children.map(c => ({ ...c, active: false }))
        })));
      }
    }
  }, [orgTree, selectedZone, showAllMembers]);

  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Resize Handlers
  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0);
      if (newWidth < 240) newWidth = 240; // Min width (increased)
      if (newWidth > 480) newWidth = 480; // Max width
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // 저장된 성도 데이터 및 조직도 로드
  useEffect(() => {
    const loadAllCallbacks = async () => {
      try {
        // 1. Members - Try loading from File System first (Source of Truth)
        let loadedMembers = await loadData<Member[]>("members");

        // Fallback to LocalStorage if File System is empty/failed
        if (!loadedMembers) {
          const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
          if (savedMembers) {
            loadedMembers = JSON.parse(savedMembers);
          }
        }

        if (loadedMembers) {
          setMembers(loadedMembers);
          // Sync up LocalStorage just in case
          localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(loadedMembers));
        }

        // 2. Org Tree (File System)
        // ... (rest of org tree logic)
        const loadedOrg = await loadData<OrgGroup[]>("org_groups");
        if (loadedOrg && loadedOrg.length > 0) {
          setOrgTree(loadedOrg);
          updateOrgCounts(loadedMembers || [], loadedOrg);
        } else {
          setOrgTree(DEFAULT_ORG_TREE);
          updateOrgCounts(loadedMembers || [], DEFAULT_ORG_TREE);
        }
      } catch (e) {
        console.error("Failed to load data", e);
        // Last resort fallback
        const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
        if (savedMembers) setMembers(JSON.parse(savedMembers));
        setOrgTree(DEFAULT_ORG_TREE);
      }
    };
    loadAllCallbacks();
  }, []);

  // 조직도 저장 헬퍼
  const saveOrgTree = async (newTree: OrgGroup[]) => {
    try {
      await saveData("org_groups", newTree);
      setOrgTree(newTree); // 상태 업데이트는 저장 성공/실패와 무관하게 즉시 반영하거나, 여기서 반영.
    } catch (e) {
      console.error("Failed to save org tree", e);
    }
  };

  // 조직별 인원수 업데이트
  const updateOrgCounts = (membersList: Member[], currentTree: OrgGroup[] = orgTree) => {
    const newTree = currentTree.map((org) => {
      let count = 0;
      if (org.children.length > 0) {
        org.children.forEach((child) => {
          count += membersList.filter((m) => m.zone === child.name).length;
        });
      } else {
        count = membersList.filter((m) => m.zone === org.name).length;
      }
      return { ...org, count };
    });
    setOrgTree(newTree);
  };

  // 조직 토글
  const toggleOrg = (orgId: string) => {
    setOrgTree((prev) =>
      prev.map((org) =>
        org.id === orgId ? { ...org, expanded: !org.expanded } : org
      )
    );
  };

  // 구역 선택
  const selectZone = (zoneName: string) => {
    setShowAllMembers(false);
    setSelectedZone(zoneName);
    setOrgTree((prev) =>
      prev.map((org) => ({
        ...org,
        children: org.children.map((child) => ({
          ...child,
          active: !showAllMembers && child.name === zoneName,
        })),
      }))
    );
  };

  // 현재 선택된 구역의 성도 필터링 (검색어 포함)
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.includes(searchQuery) ||
      (m.phone && m.phone.includes(searchQuery));

    if (showAllMembers) {
      return matchesSearch;
    }
    return m.zone === selectedZone && matchesSearch;
  });

  // --- CRUD Handlers ---

  const openModal = (
    type: "add_group" | "edit_group" | "add_zone" | "edit_zone",
    targetId?: string,
    parentId?: string,
    initialValue: string = ""
  ) => {
    setModalState({ isOpen: true, type, targetId, parentId, initialValue });
    setModalInput(initialValue);
  };

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
    setModalInput("");
  };

  const handleModalSubmit = async () => {
    if (!modalInput.trim()) return;

    let newTree = [...orgTree];

    if (modalState.type === "add_group") {
      newTree.push({
        id: Date.now().toString(),
        name: modalInput,
        count: 0,
        expanded: true,
        children: [],
      });
    } else if (modalState.type === "edit_group" && modalState.targetId) {
      newTree = newTree.map((g) =>
        g.id === modalState.targetId ? { ...g, name: modalInput } : g
      );
    } else if (modalState.type === "add_zone" && modalState.parentId) {
      newTree = newTree.map((g) => {
        if (g.id === modalState.parentId) {
          return {
            ...g,
            children: [
              ...g.children,
              { id: Date.now().toString(), name: modalInput, active: false },
            ],
          };
        }
        return g;
      });
    } else if (modalState.type === "edit_zone" && modalState.targetId) {
      newTree = newTree.map((g) => ({
        ...g,
        children: g.children.map((c) =>
          c.id === modalState.targetId ? { ...c, name: modalInput } : c
        ),
      }));
    }

    await saveOrgTree(newTree);
    closeModal();
  };

  const handleDelete = (id: string, isZone: boolean, parentId?: string) => {
    setDeleteModal({
      isOpen: true,
      type: isZone ? "zone" : "group",
      targetId: id,
      parentId: parentId
    });
  };

  // 성도 선택 토글
  const toggleSelectMember = (memberId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  // 선택된 성도 삭제 요청
  const handleDeleteMembers = () => {
    if (selectedIds.size === 0) {
      alert("삭제할 성도를 선택해주세요.");
      return;
    }
    setDeleteModal({
      isOpen: true,
      type: "member_bulk",
      count: selectedIds.size
    });
  };

  // 삭제 확정 처리 (통합)
  const confirmDelete = async () => {
    try {
      if (deleteModal.type === "member_bulk") {
        const updatedMembers = members.filter(m => !selectedIds.has(m.id));
        await saveData("members", updatedMembers);
        localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
        setMembers(updatedMembers);
        setSelectedIds(new Set());
      }
      else if (deleteModal.type === "group" && deleteModal.targetId) {
        const newTree = orgTree.filter(g => g.id !== deleteModal.targetId);
        await saveOrgTree(newTree);
      }
      else if (deleteModal.type === "zone" && deleteModal.targetId && deleteModal.parentId) {
        const newTree = orgTree.map(g => {
          if (g.id === deleteModal.parentId) {
            return { ...g, children: g.children.filter(c => c.id !== deleteModal.targetId) };
          }
          return g;
        });
        await saveOrgTree(newTree);
      }

      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="members-page">
      <aside
        ref={sidebarRef}
        className="members-sidebar"
        style={{ width: `${sidebarWidth}px`, position: 'relative' }}
      >
        <div className="members-sidebar__header">
          <div>
            <h2 className="members-sidebar__title">조직도</h2>
            <p className="members-sidebar__subtitle">교회 조직 및 부서 관리</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canEditOrg && (
              <label className="edit-mode-switch" title="편집 모드">
                <input
                  type="checkbox"
                  checked={editMode}
                  onChange={(e) => setEditMode(e.target.checked)}
                />
                <span className="edit-mode-switch__slider" />

              </label>
            )}
            {editMode && (
              <button
                className="members-sidebar__add-btn"
                title="그룹 추가"
                onClick={() => openModal("add_group")}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '0 0.75rem 0.75rem' }}>
          <div className="search-bar" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <span className="material-symbols-outlined" style={{ marginRight: '0.5rem', color: 'var(--text-secondary)' }}>search</span>
            <input
              type="text"
              placeholder="성도 이름 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
            />
          </div>

          <button
            className={`btn btn--full ${showAllMembers ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setShowAllMembers(true)}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ marginRight: '0.5rem' }}>groups</span>
            전체 성도 보기
          </button>
        </div>

        <nav className="members-sidebar__nav">
          <div className="org-tree">
            {orgTree.map((org) => (
              <div key={org.id} className="org-tree__node">
                <div
                  className={`org-tree__row ${org.expanded ? "expanded" : "collapsed"}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '0.5rem', cursor: 'pointer' }}
                  onClick={() => toggleOrg(org.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0.75rem 1rem' }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ marginRight: '0.5rem', transition: 'transform 0.2s', transform: org.expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    >
                      expand_more
                    </span>
                    <span style={{ fontWeight: 500 }}>{org.name}</span>
                    <span className="org-tree__count" style={{ marginLeft: '0.5rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem' }}>{org.count}</span>
                  </div>

                  {editMode && (
                    <div className="org-tree__actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => openModal("add_zone", undefined, org.id)}
                        title="구역 추가"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>add_circle</span>
                      </button>
                      <button
                        onClick={() => openModal("edit_group", org.id, undefined, org.name)}
                        title="그룹 수정"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(org.id, false)}
                        title="그룹 삭제"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {org.expanded && org.children.length > 0 && (
                  <div className="org-tree__children">
                    {org.children.map((child) => (
                      <div
                        key={child.id}
                        className={`org-tree__child ${child.active ? "active" : ""}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '0.5rem' }}
                      >
                        <div
                          className="org-tree__child-btn"
                          onClick={() => selectZone(child.name)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 1rem 0.5rem 2rem' }}
                        >
                          <span className="org-tree__child-dot" style={{ marginRight: '0.5rem' }} />
                          <span>{child.name}</span>
                        </div>

                        {editMode && (
                          <div className="org-tree__actions" style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openModal("edit_zone", child.id, undefined, child.name); }}
                              title="구역 수정"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#9ca3af' }}>edit</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(child.id, true, org.id); }}
                              title="구역 삭제"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#9ca3af' }}>close</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="members-sidebar__footer">
          <span className="material-symbols-outlined">info</span>
          <span>전체 등록 성도: {members.length}명</span>
        </div>

        {/* Resize Handle */}
        <div
          className="sidebar-resizer"
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            top: 0,
            right: '-3px',
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 100,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(22, 100, 156, 0.3)'}
          onMouseLeave={(e) => {
            if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        />
      </aside>

      {/* Main Content */}
      <main className="members-content">
        <div className="members-content__inner">
          <div className="breadcrumb">
            <a href="#">성도 관리</a>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="breadcrumb__current">{selectedZone}</span>
          </div>

          <div className="page-header">
            <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h2 className="content-header__title">
                  {showAllMembers
                    ? `전체 성도 (${filteredMembers.length}명)`
                    : `${selectedZone} (${filteredMembers.length}명)`}
                </h2>
                <p className="content-header__subtitle">
                  {showAllMembers ? "등록된 모든 성도 목록입니다." : "해당 구역의 성도 목록입니다."}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedIds.size > 0 && (
                  <button
                    className="btn btn--danger"
                    onClick={handleDeleteMembers}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    선택 삭제 ({selectedIds.size})
                  </button>
                )}
                <Link to="/members/new" className="btn btn--primary" style={{ whiteSpace: 'nowrap' }}>
                  <span className="material-symbols-outlined">add</span>
                  성도 등록
                </Link>
              </div>
            </div>
            {/* Members List */}
            <div className="form-card">
              {filteredMembers.length > 0 ? (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                          onChange={toggleSelectAll}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ width: '60px' }}>사진</th>
                      <th>이름</th>
                      <th>직분</th>
                      <th>연락처</th>
                      <th>소속</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        style={{ cursor: 'pointer' }}
                        className="hover:bg-gray-50"
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(member.id)}
                            onChange={() => toggleSelectMember(member.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>
                          <div style={{
                            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                            backgroundColor: member.profileImage ? '#f3f4f6' : '#bfdbfe',
                            overflow: 'hidden', flexShrink: 0,
                            border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: member.profileImage ? 'inherit' : '#1e40af', fontWeight: 'bold'
                          }}>
                            {member.profileImage ? (
                              <img
                                src={member.profileImage}
                                alt={member.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerText = member.name.charAt(0);
                                    parent.style.backgroundColor = '#bfdbfe';
                                    parent.style.color = '#1e40af';
                                  }
                                }}
                              />
                            ) : (
                              <span>{member.name.charAt(0)}</span>
                            )}
                          </div>
                        </td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>
                          <strong>{member.name}</strong>
                        </td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>{member.role}</td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>{member.phone}</td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>{member.zone}</td>
                        <td onClick={() => navigate(`/members/edit/${member.id}`)}>
                          <span className={`status-badge status-badge--${member.status || 'registered'}`}>
                            {member.status === 'moved' ? '이명' :
                              member.status === 'visitor' ? '방문' :
                                '등록'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }}
                  >
                    person_off
                  </span>
                  <p>등록된 성도가 없습니다.</p>
                  <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                    "성도 등록" 버튼을 클릭하여 새 성도를 등록해주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* CRUD Modal */}
      {
        modalState.isOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ width: '400px' }}>
              <div className="modal__header">
                <h3 className="modal__title">
                  {modalState.type === "add_group" && "새 그룹 추가"}
                  {modalState.type === "edit_group" && "그룹 이름 수정"}
                  {modalState.type === "add_zone" && "새 구역 추가"}
                  {modalState.type === "edit_zone" && "구역 이름 수정"}
                </h3>
                <button className="modal__close" onClick={closeModal}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="modal__content">
                <div className="form-group">
                  <label className="form-label">이름</label>
                  <input
                    type="text"
                    className="form-input"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="이름을 입력하세요"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleModalSubmit();
                    }}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button className="btn btn--outline" onClick={closeModal}>취소</button>
                <button className="btn btn--primary" onClick={handleModalSubmit}>저장</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Unified Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: '400px' }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: 'var(--danger)' }}>
                <span className="material-symbols-outlined" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>warning</span>
                삭제 확인
              </h3>
              <button className="modal__close" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal__content">
              {deleteModal.type === "member_bulk" && (
                <>
                  <p style={{ margin: '1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    선택한 <strong>{deleteModal.count}명</strong>의 성도를 삭제하시겠습니까?
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    삭제된 데이터는 복구할 수 없습니다. 신중하게 결정해주세요.
                  </p>
                </>
              )}
              {deleteModal.type === "group" && (
                <>
                  <p style={{ margin: '1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    해당 <strong>교구(그룹)</strong>를 삭제하시겠습니까?
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    소속된 구역과 성도의 분류 정보가 초기화될 수 있습니다.
                  </p>
                </>
              )}
              {deleteModal.type === "zone" && (
                <>
                  <p style={{ margin: '1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    해당 <strong>구역</strong>을 삭제하시겠습니까?
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    소속된 성도의 구역 정보가 '미배정' 처리될 수 있습니다.
                  </p>
                </>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}>취소</button>
              <button className="btn btn--danger" onClick={confirmDelete}>삭제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
