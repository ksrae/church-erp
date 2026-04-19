import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  WorshipSchedule, WorshipInstance,
  worshipTypeLabels, worshipTypeColors,
} from "../../types/worship";
import { logActivity } from "../../utils/auditLog";
import { useAuth } from "../../App";

type WType = WorshipInstance["type"];

function generateInstancesFromSchedule(schedule: WorshipSchedule, year: number, month: number): string[] {
  const dates: string[] = [];
  const { recurrence, startDate, endDate, exceptions } = schedule;

  const skipped = new Set(exceptions.filter((e) => e.kind === "skip").map((e) => e.date));

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  if (recurrence.kind === "once") {
    const d = startDate;
    if (d >= `${year}-${String(month + 1).padStart(2, "0")}-01` && d <= lastDay.toISOString().split("T")[0]) {
      if (!skipped.has(d)) dates.push(d);
    }
  } else if (recurrence.kind === "weekly" && recurrence.dayOfWeek !== undefined) {
    const dow = recurrence.dayOfWeek;
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === dow) {
        const dateStr = d.toISOString().split("T")[0];
        if (dateStr >= startDate && (!endDate || dateStr <= endDate) && !skipped.has(dateStr)) {
          dates.push(dateStr);
        }
      }
    }
  } else if (recurrence.kind === "monthly" && recurrence.dayOfWeek !== undefined && recurrence.weekOfMonth !== undefined) {
    const dow = recurrence.dayOfWeek;
    const weekNum = recurrence.weekOfMonth;
    let count = 0;
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === dow) {
        count++;
        if (count === weekNum) {
          const dateStr = d.toISOString().split("T")[0];
          if (dateStr >= startDate && (!endDate || dateStr <= endDate) && !skipped.has(dateStr)) {
            dates.push(dateStr);
          }
          break;
        }
      }
    }
  }
  return dates;
}

function WorshipCalendar() {
  const navigate = useNavigate();
  const { auth: authState } = useAuth();
  const churchId = authState.type === "church" ? authState.admin.churchId : "";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<WorshipSchedule[]>([]);
  const [instances, setInstances] = useState<WorshipInstance[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);

  const [scheduleForm, setScheduleForm] = useState<Partial<WorshipSchedule>>({
    name: "", type: "sunday",
    recurrence: { kind: "weekly", dayOfWeek: 0, time: "11:00" },
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedSnap, instSnap] = await Promise.all([
        getDocs(query(collection(db, "worshipSchedules"), orderBy("startDate", "desc"))),
        getDocs(query(collection(db, "worshipInstances"), orderBy("date", "desc"))),
      ]);
      const loadedSchedules = schedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipSchedule));
      const loadedInstances = instSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipInstance));
      setSchedules(loadedSchedules);
      setInstances(loadedInstances);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleAddSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.startDate) {
      alert("일정 이름과 시작일을 입력해주세요.");
      return;
    }
    try {
      const data: Omit<WorshipSchedule, "id"> = {
        churchId,
        name: scheduleForm.name!,
        type: scheduleForm.type as WType || "sunday",
        recurrence: scheduleForm.recurrence!,
        startDate: scheduleForm.startDate!,
        endDate: scheduleForm.endDate,
        exceptions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "worshipSchedules"), { ...data, createdAt: serverTimestamp() });
      setSchedules((prev) => [...prev, { id: ref.id, ...data }]);
      await logActivity("WORSHIP", "예배 일정 등록", `${data.name} 스케줄이 등록되었습니다.`);
      setShowScheduleModal(false);
    } catch (e: any) { alert(`저장 실패: ${e.message}`); }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("이 예배 스케줄을 삭제하시겠습니까? 연관된 예배 내역은 유지됩니다.")) return;
    await deleteDoc(doc(db, "worshipSchedules", scheduleId));
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay.getDay() - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return days;
  };

  const getWorshipsForDate = (dateStr: string) => {
    const fromInstances = instances.filter((i) => i.date === dateStr);
    const fromSchedules: { scheduleId: string; scheduleName: string; type: WType; time: string; isException: boolean }[] = [];

    for (const sched of schedules) {
      const generatedDates = generateInstancesFromSchedule(sched, year, month);
      if (generatedDates.includes(dateStr)) {
        const alreadyHasInstance = instances.some((i) => i.scheduleId === sched.id && i.date === dateStr);
        if (!alreadyHasInstance) {
          fromSchedules.push({
            scheduleId: sched.id, scheduleName: sched.name,
            type: sched.type, time: sched.recurrence.time, isException: false,
          });
        }
      }
    }
    return { instances: fromInstances, scheduled: fromSchedules };
  };

  const handleScheduledClick = async (scheduleId: string, date: string, scheduleName: string, type: WType, time: string) => {
    if (confirm(`"${scheduleName}" 예배 세부 내역을 입력하시겠습니까?`)) {
      const data: Omit<WorshipInstance, "id"> = {
        churchId,
        scheduleId, date, type, time, title: "", preacher: "", scripture: "",
        order: [], isPublished: false, detailStatus: "empty",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "worshipInstances"), { ...data, createdAt: serverTimestamp() });
      const newInstance = { id: ref.id, ...data };
      setInstances((prev) => [...prev, newInstance]);
      navigate(`/worship/${ref.id}`);
    }
  };

  const days = getDaysInMonth();
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-header__title">예배 관리</h1>
            <p className="page-header__description">예배 스케줄을 등록하고 세부 내역을 관리합니다.</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowScheduleModal(true)}>
            <span className="material-symbols-outlined">add</span>
            예배 스케줄 추가
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="form-card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{year}년 {month + 1}월</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border-color)" }}>
          {weekDays.map((d, i) => (
            <div key={d} style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", fontWeight: 600, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "var(--text-secondary)" }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((day, idx) => {
            const dateStr = day.date.toISOString().split("T")[0];
            const { instances: dayInst, scheduled: daySched } = getWorshipsForDate(dateStr);
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const dow = day.date.getDay();

            return (
              <div
                key={idx}
                style={{
                  minHeight: "5rem", padding: "0.5rem", borderRight: "1px solid var(--border-color)",
                  borderBottom: "1px solid var(--border-color)", opacity: day.isCurrentMonth ? 1 : 0.35,
                  background: isToday ? "#eff6ff" : "white",
                }}
              >
                <div style={{
                  width: "1.75rem", height: "1.75rem", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--primary)" : "transparent",
                  color: isToday ? "white" : dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "var(--text-primary)",
                  fontSize: "0.875rem", fontWeight: isToday ? 700 : 400,
                  marginBottom: "0.25rem",
                }}>
                  {day.date.getDate()}
                </div>

                {daySched.map((s) => (
                  <div
                    key={s.scheduleId}
                    onClick={() => day.isCurrentMonth && handleScheduledClick(s.scheduleId, dateStr, s.scheduleName, s.type, s.time)}
                    style={{
                      fontSize: "0.7rem", padding: "2px 4px", borderRadius: "4px", marginBottom: "2px",
                      background: `${worshipTypeColors[s.type]}22`, color: worshipTypeColors[s.type],
                      border: `1px dashed ${worshipTypeColors[s.type]}66`,
                      cursor: day.isCurrentMonth ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: "2px",
                    }}
                    title={`${s.scheduleName} - 세부 내역 입력`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "0.7rem" }}>add_circle</span>
                    {s.scheduleName}
                  </div>
                ))}

                {dayInst.map((inst) => (
                  <div
                    key={inst.id}
                    onClick={() => navigate(`/worship/${inst.id}`)}
                    style={{
                      fontSize: "0.7rem", padding: "2px 4px", borderRadius: "4px", marginBottom: "2px",
                      background: worshipTypeColors[inst.type] + "22", color: worshipTypeColors[inst.type],
                      border: `1px solid ${worshipTypeColors[inst.type]}66`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "2px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "0.7rem" }}>
                      {inst.detailStatus === "complete" ? "check_circle" : inst.detailStatus === "partial" ? "pending" : "radio_button_unchecked"}
                    </span>
                    {inst.title || worshipTypeLabels[inst.type]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule List */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>등록된 예배 스케줄</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {schedules.length === 0 ? (
            <div className="form-card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>church</span>
              <p>등록된 예배 스케줄이 없습니다.</p>
              <p style={{ fontSize: "0.875rem" }}>위 "예배 스케줄 추가" 버튼으로 반복 예배를 설정하세요.</p>
            </div>
          ) : (
            schedules.map((sched) => (
              <div key={sched.id} className="form-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "0.5rem", height: "3rem", borderRadius: "4px", background: worshipTypeColors[sched.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{sched.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span>{worshipTypeLabels[sched.type]}</span>
                    <span>•</span>
                    <span>
                      {sched.recurrence.kind === "once" ? "1회" :
                        sched.recurrence.kind === "weekly" ? `매주 ${["일", "월", "화", "수", "목", "금", "토"][sched.recurrence.dayOfWeek || 0]}요일` :
                          `매월 ${sched.recurrence.weekOfMonth}번째 ${["일", "월", "화", "수", "목", "금", "토"][sched.recurrence.dayOfWeek || 0]}요일`}
                    </span>
                    <span>{sched.recurrence.time}</span>
                    <span>•</span>
                    <span>{sched.startDate} ~{sched.endDate ? ` ${sched.endDate}` : " 계속"}</span>
                    {sched.exceptions.length > 0 && <span style={{ color: "#d97706" }}>예외 {sched.exceptions.length}건</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(sched.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                  title="스케줄 삭제"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Add Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: "520px" }}>
            <div className="modal__header">
              <h3 className="modal__title">예배 스케줄 추가</h3>
              <button className="modal__close" onClick={() => setShowScheduleModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label className="form-label">일정 이름 *</label>
                <input
                  type="text" className="form-input" placeholder="예: 주일 오전 예배"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">예배 종류</label>
                  <select className="form-select" value={scheduleForm.type} onChange={(e) => setScheduleForm((p) => ({ ...p, type: e.target.value as WType }))}>
                    <option value="sunday">주일예배</option>
                    <option value="wednesday">수요예배</option>
                    <option value="special">특별예배</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">시간</label>
                  <input type="time" className="form-input" value={scheduleForm.recurrence?.time || "11:00"} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, time: e.target.value } }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">반복</label>
                <select className="form-select" value={scheduleForm.recurrence?.kind} onChange={(e) => {
                  const kind = e.target.value as "once" | "weekly" | "monthly";
                  setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, kind, dayOfWeek: kind !== "once" ? (p.recurrence?.dayOfWeek ?? 0) : undefined } }));
                }}>
                  <option value="once">1회만</option>
                  <option value="weekly">매주 반복</option>
                  <option value="monthly">매월 반복</option>
                </select>
              </div>
              {scheduleForm.recurrence?.kind !== "once" && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">요일</label>
                    <select className="form-select" value={scheduleForm.recurrence?.dayOfWeek ?? 0} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, dayOfWeek: parseInt(e.target.value) } }))}>
                      {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                    </select>
                  </div>
                  {scheduleForm.recurrence?.kind === "monthly" && (
                    <div className="form-group">
                      <label className="form-label">몇째 주</label>
                      <select className="form-select" value={scheduleForm.recurrence?.weekOfMonth ?? 1} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, weekOfMonth: parseInt(e.target.value) } }))}>
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}번째</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">시작일 *</label>
                  <input type="date" className="form-input" value={scheduleForm.startDate} onChange={(e) => setScheduleForm((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                {scheduleForm.recurrence?.kind !== "once" && (
                  <div className="form-group">
                    <label className="form-label">종료일 (선택)</label>
                    <input type="date" className="form-input" value={scheduleForm.endDate || ""} onChange={(e) => setScheduleForm((p) => ({ ...p, endDate: e.target.value || undefined }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setShowScheduleModal(false)}>취소</button>
              <button className="btn btn--primary" onClick={handleAddSchedule}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorshipCalendar;
