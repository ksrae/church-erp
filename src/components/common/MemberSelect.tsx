import { useState, useEffect, useRef, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";

export interface SelectMember {
  id: string;
  name: string;
  role?: string;
  profileImage?: string;
  phone?: string;
  zone?: string;
}

interface MemberSelectProps {
  value: string;
  onChange: (value: string) => void;
  members: SelectMember[];
  placeholder?: string;
  includeAnonymous?: boolean;
  roleFilter?: string | string[];
  disabled?: boolean;
  className?: string;
}

export function MemberSelect({
  value,
  onChange,
  members,
  placeholder = "성도를 검색하세요",
  includeAnonymous = false,
  roleFilter,
  disabled = false,
  className = "",
}: MemberSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search term with value only if value matches a member (or is empty initially)
  // This allows the user to see what they selected.
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search term to value on blur/close to show selected
        setSearchTerm(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [value]);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Apply Role Filter
    if (roleFilter) {
      const filters = Array.isArray(roleFilter) ? roleFilter : [roleFilter];
      filtered = filtered.filter(m => {
        if (!m.role) return false;
        // Check if role includes any of the filter strings
        return filters.some(f => m.role!.includes(f));
      });
    }

    // Apply Search Term
    // Only filter if search term is active and NOT exact match of current value (avoid hiding the selected item if that's what we typed)
    // Actually, simple includes filter is fine.
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.role && m.role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [members, searchTerm, roleFilter]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setSearchTerm(selectedValue);
    setIsOpen(false);
  };

  const getMemberImageSrc = (member: SelectMember): string | null => {
    if (!member.profileImage) return null;
    if (member.profileImage.startsWith("data:") || member.profileImage.startsWith("http")) {
      return member.profileImage;
    }
    // Tauri specific handling - simplified since we might not have isTauriEnv/convertFileSrc everywhere available directly 
    // or we assume this component runs in Tauri context.
    // The import is safe.
    try {
      return convertFileSrc(member.profileImage);
    } catch (e) {
      return member.profileImage;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`member-select-container ${disabled ? "disabled" : ""} ${className}`}
      style={{ position: "relative", width: "100%" }}
    >
      <div className="input-group" style={{ position: 'relative' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            const newVal = e.target.value;
            setSearchTerm(newVal);
            onChange(newVal); // Propagate text change to parent
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            paddingRight: '2.5rem',
            paddingLeft: '2.5rem', // Space for search icon
            background: disabled ? '#f1f5f9' : 'white',
            border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            transition: 'all 0.15s ease',
            height: '2.75rem',
            outline: 'none',
            boxShadow: isOpen ? "0 0 0 3px rgba(22, 100, 156, 0.1)" : "none",
          }}
          autoComplete="off"
        />

        {/* Search Icon (Left) */}
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '1.25rem',
            pointerEvents: 'none',
          }}
        >
          search
        </span>

        {/* Dropdown Toggle Icon (Right) */}
        <div
          onClick={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            color: '#64748b',
            zIndex: 10,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="member-select-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            maxHeight: "300px",
            overflowY: "auto",
            background: "white",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            zIndex: 9999,
          }}
        >
          {/* Anonymous Option */}
          {includeAnonymous && !searchTerm && (
            <div
              onClick={() => handleSelect("익명")}
              style={{
                padding: "0.75rem 1rem",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f172a"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
            >
              익명
            </div>
          )}

          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(member.name);
                }}
                style={{
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  borderBottom: "1px solid #f1f5f9",
                  background: member.name === value ? "#eff6ff" : "white"
                }}
                onMouseEnter={(e) => {
                  if (member.name !== value) e.currentTarget.style.backgroundColor = "#f0f9ff";
                }}
                onMouseLeave={(e) => {
                  if (member.name !== value) e.currentTarget.style.backgroundColor = "white";
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  color: '#0369a1',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}>
                  {getMemberImageSrc(member) ? (
                    <img
                      src={getMemberImageSrc(member)!}
                      alt={member.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '0.875rem' }}>
                    {member.name}
                    {member.role && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem', fontWeight: 400 }}>
                        ({member.role})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              {searchTerm ? "검색 결과가 없습니다" : "성도 목록이 없습니다"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
