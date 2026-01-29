import React, { useEffect, useState } from "react";
import { ActivityLog, getLogs, LogCategory, deleteLogs } from "../utils/auditLog";
import { useNavigate, useOutletContext } from "react-router-dom";
import { LayoutOutletContext } from "../components/Layout";
import "../styles/pages.css"; // Reuse existing styles where possible

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useOutletContext<LayoutOutletContext>();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selection state for deletion
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  };

  const isSuperUser = currentUser?.role === "super";

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedLogIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLogIds.size === 0) return;

    if (window.confirm(`${selectedLogIds.size}개의 활동 기록을 삭제하시겠습니까?\n삭제된 내용은 '로그 삭제' 기록에 남게 됩니다.`)) {
      try {
        await deleteLogs(Array.from(selectedLogIds), currentUser?.username || "SuperUser");

        // Reset and reload
        setSelectedLogIds(new Set());
        setIsSelectionMode(false);
        await loadLogs();
      } catch (error) {
        alert("로그 삭제 중 오류가 발생했습니다.");
        console.error(error);
      }
    }
  };

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, ActivityLog[]>);

  const getCategoryIcon = (category: LogCategory) => {
    switch (category) {
      case "MEMBER": return "groups";
      case "FINANCE": return "account_balance_wallet";
      case "SETTINGS": return "settings";
      case "SYSTEM": return "dns";
      case "RESOURCES": return "folder";
      case "HELP": return "help";
      default: return "info";
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  width: '2.5rem',
                  height: '2.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="page-header__title" style={{ margin: 0 }}>알림 센터</h1>
            </div>
            <p className="page-header__description" style={{ marginLeft: '3.5rem' }}>
              시스템의 모든 활동 기록을 확인할 수 있습니다.
            </p>
          </div>

          {isSuperUser && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isSelectionMode ? (
                <>
                  <button
                    className="btn btn--danger"
                    onClick={handleDeleteSelected}
                    disabled={selectedLogIds.size === 0}
                    style={{ opacity: selectedLogIds.size === 0 ? 0.5 : 1 }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    삭제 ({selectedLogIds.size})
                  </button>
                  <button
                    className="btn btn--outline"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedLogIds(new Set());
                    }}
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  className="btn btn--outline"
                  onClick={() => setIsSelectionMode(true)}
                >
                  <span className="material-symbols-outlined">checklist</span>
                  기록 관리
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            기록을 불러오는 중...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}>notifications_off</span>
            <p style={{ color: 'var(--text-secondary)' }}>아직 기록된 활동이 없습니다.</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, dayLogs]) => (
            <div key={date} className="notification-group" style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>calendar_today</span>
                {date}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => isSelectionMode && handleToggleSelect(log.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      background: isSelectionMode && selectedLogIds.has(log.id) ? '#eff6ff' : 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid',
                      borderColor: isSelectionMode && selectedLogIds.has(log.id) ? 'var(--primary)' : 'var(--border-color)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      cursor: isSelectionMode ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelectionMode && (
                      <div style={{ display: 'flex', alignItems: 'center', height: '2.5rem' }}>
                        <div style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          borderRadius: '4px',
                          border: `2px solid ${selectedLogIds.has(log.id) ? 'var(--primary)' : '#cbd5e1'}`,
                          background: selectedLogIds.has(log.id) ? 'var(--primary)' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem'
                        }}>
                          {selectedLogIds.has(log.id) && <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span>}
                        </div>
                      </div>
                    )}

                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--background-light)',
                      color: 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      <span className="material-symbols-outlined">{getCategoryIcon(log.category)}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.action}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatTime(log.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                        {log.details}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.5rem' }}>
                        <span>{log.category}</span>
                        <span>•</span>
                        <span>{log.user || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
