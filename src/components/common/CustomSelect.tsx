import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "선택하세요",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${disabled ? "disabled" : ""} ${className}`}
      style={{
        position: "relative",
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      {/* Trigger Area (Mimics the original input look) */}
      <div
        className="custom-select-trigger"
        onClick={handleToggle}
        style={{
          width: "100%",
          height: "2.75rem",
          padding: "0.5rem 1rem",
          paddingRight: "2.5rem",
          background: disabled ? "#f1f5f9" : (isOpen ? "white" : "#f8fafc"),
          border: `1px solid ${isOpen ? "var(--primary)" : "var(--border-color)"}`,
          borderRadius: "var(--radius-lg)",
          fontSize: "0.875rem",
          color: selectedOption ? "var(--text-primary)" : "#9ca3af",
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          boxShadow: isOpen ? "0 0 0 3px rgba(22, 100, 156, 0.1)" : "none",
          position: "relative",
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Arrow Icon */}
        <div
          style={{
            position: "absolute",
            right: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1.5rem",
            height: "1.5rem",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="24px" height="24px">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="custom-select-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            maxHeight: "200px",
            overflowY: "auto",
            background: "white",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            zIndex: 1000,
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "0.75rem 1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
              옵션이 없습니다
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                style={{
                  padding: "0.625rem 1rem",
                  fontSize: "0.875rem",
                  color: option.value === value ? "var(--primary)" : "var(--text-primary)",
                  backgroundColor: option.value === value ? "#eff6ff" : "transparent",
                  fontWeight: option.value === value ? 600 : 400,
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) e.currentTarget.style.backgroundColor = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
