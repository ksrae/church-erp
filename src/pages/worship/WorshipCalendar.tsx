import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  WorshipSchedule, WorshipInstance, WorshipType,
  worshipTypeLabels, worshipTypeColors,
  ONE_TIME_EVENT_TYPES, isOneTimeEvent,
  WORSHIP_SCHEDULE_TYPES,
} from "../../types/worship";
import { logActivity } from "../../utils/auditLog";
import { useAuth } from "../../App";
import { useLocale } from "../../i18n/LocaleContext";

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
  const { t, locale } = useLocale();
  const { auth: authState } = useAuth();
  const churchId = authState.type === "church" ? authState.admin.churchId : "";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<WorshipSchedule[]>([]);
  const [instances, setInstances] = useState<WorshipInstance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"event" | "schedule">("schedule");
  const [_isLoading, setIsLoading] = useState(true);

  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const weekDays = weekdayKeys.map((k) => t(`worship.cal.weekday.${k}` as any));

  const worshipTypeLabel = (type: WorshipType): string => {
    const key = `worship.type.${type}`;
    const translated = t(key as any);
    return translated === key ? worshipTypeLabels[type] : translated;
  };

  const formatMonthTitle = (y: number, m: number): string => {
    if (locale === "ko") return t("worship.cal.monthTitle", { year: y, month: m + 1 });
    const monthName = new Date(2000, m, 1).toLocaleString("en-US", { month: "long" });
    return t("worship.cal.monthTitle", { year: y, month: monthName });
  };

  const [scheduleForm, setScheduleForm] = useState<Partial<WorshipSchedule>>({
    name: "", type: "sunday",
    recurrence: { kind: "weekly", dayOfWeek: 0, time: "11:00" },
    startDate: new Date().toISOString().split("T")[0],
  });

  const [eventForm, setEventForm] = useState<Partial<WorshipInstance>>({
    type: "event",
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    location: "",
    description: "",
    isPublished: true,
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
      alert(t("worship.cal.nameRequired"));
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
      await logActivity(
        "WORSHIP",
        t("worship.audit.scheduleCreated"),
        t("worship.audit.scheduleCreatedBody", { name: data.name }),
      );
      setShowAddModal(false);
    } catch (e: any) { alert(t("worship.cal.saveFailed", { msg: e.message })); }
  };

  const openAddModal = (dateStr?: string, mode: "event" | "schedule" = "schedule") => {
    const date = dateStr || new Date().toISOString().split("T")[0];
    setAddMode(mode);
    setEventForm({
      type: "event",
      title: "",
      date,
      time: "",
      location: "",
      description: "",
      isPublished: true,
    });
    setScheduleForm({
      name: "", type: "sunday",
      recurrence: { kind: "weekly", dayOfWeek: new Date(date).getDay(), time: "11:00" },
      startDate: date,
    });
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      alert(t("worship.cal.titleRequired"));
      return;
    }
    try {
      const data: Omit<WorshipInstance, "id"> = {
        churchId,
        date: eventForm.date!,
        endDate: eventForm.endDate,
        type: eventForm.type as WorshipType,
        time: eventForm.time,
        endTime: eventForm.endTime,
        title: eventForm.title,
        location: eventForm.location,
        description: eventForm.description,
        order: [],
        isPublished: eventForm.isPublished !== false,
        detailStatus: "complete",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "worshipInstances"), { ...data, createdAt: serverTimestamp() });
      setInstances((prev) => [...prev, { id: ref.id, ...data }]);
      await logActivity(
        "WORSHIP",
        t("worship.audit.eventCreated"),
        t("worship.audit.eventCreatedBody", { title: data.title || "" }),
      );
      setShowAddModal(false);
      setEventForm({
        type: "event",
        title: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
        location: "",
        description: "",
        isPublished: true,
      });
    } catch (e: any) { alert(t("worship.cal.saveFailed", { msg: e.message })); }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm(t("worship.cal.deleteInstanceConfirm"))) return;
    try {
      await deleteDoc(doc(db, "worshipInstances", id));
      setInstances((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { alert(t("worship.cal.deleteFailed", { msg: e.message })); }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm(t("worship.cal.deleteScheduleConfirm"))) return;
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
    if (confirm(t("worship.cal.scheduleDetailConfirm", { name: scheduleName }))) {
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

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-header__title">{t("worship.cal.pageTitle")}</h1>
            <p className="page-header__description">{t("worship.cal.pageDescription")}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" onClick={() => openAddModal()}>
              <span className="material-symbols-outlined">add</span>
              {t("worship.cal.addEvent")}
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="form-card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{formatMonthTitle(year, month)}</h2>
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
                onClick={() => day.isCurrentMonth && openAddModal(dateStr)}
                style={{
                  minHeight: "5rem", padding: "0.5rem", borderRight: "1px solid var(--border-color)",
                  borderBottom: "1px solid var(--border-color)", opacity: day.isCurrentMonth ? 1 : 0.35,
                  background: isToday ? "#eff6ff" : "white",
                  cursor: day.isCurrentMonth ? "pointer" : "default",
                }}
                title={day.isCurrentMonth ? t("worship.cal.dayHint") : ""}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      if (day.isCurrentMonth) handleScheduledClick(s.scheduleId, dateStr, s.scheduleName, s.type, s.time);
                    }}
                    style={{
                      fontSize: "0.7rem", padding: "2px 4px", borderRadius: "4px", marginBottom: "2px",
                      background: `${worshipTypeColors[s.type]}22`, color: worshipTypeColors[s.type],
                      border: `1px dashed ${worshipTypeColors[s.type]}66`,
                      cursor: day.isCurrentMonth ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: "2px",
                    }}
                    title={t("worship.cal.scheduleTip", { name: s.scheduleName })}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "0.7rem" }}>add_circle</span>
                    {s.scheduleName}
                  </div>
                ))}

                {dayInst.map((inst) => {
                  const oneTime = isOneTimeEvent(inst.type);
                  return (
                    <div
                      key={inst.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!oneTime) navigate(`/admin/church/worship/${inst.id}`);
                      }}
                      style={{
                        fontSize: "0.7rem", padding: "2px 4px", borderRadius: "4px", marginBottom: "2px",
                        background: worshipTypeColors[inst.type] + "22", color: worshipTypeColors[inst.type],
                        border: `1px solid ${worshipTypeColors[inst.type]}66`,
                        cursor: oneTime ? "default" : "pointer", display: "flex", alignItems: "center", gap: "2px",
                      }}
                      title={oneTime ? t("worship.cal.instanceTipEvent") : t("worship.cal.instanceTipWorship")}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "0.7rem" }}>
                        {oneTime ? "event" : inst.detailStatus === "complete" ? "check_circle" : inst.detailStatus === "partial" ? "pending" : "radio_button_unchecked"}
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inst.title || worshipTypeLabel(inst.type)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule List */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("worship.cal.scheduleListTitle")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {schedules.length === 0 ? (
            <div className="form-card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>church</span>
              <p>{t("worship.cal.scheduleEmpty")}</p>
              <p style={{ fontSize: "0.875rem" }}>{t("worship.cal.scheduleEmptyHint")}</p>
            </div>
          ) : (
            schedules.map((sched) => {
              const dayIdx = sched.recurrence.dayOfWeek ?? 0;
              const dayLabel = t(`worship.cal.weekday.${weekdayKeys[dayIdx]}` as any);
              const dayFull = locale === "ko" ? t("worship.cal.weekdayLabel", { day: dayLabel }) : dayLabel;
              const recLabel =
                sched.recurrence.kind === "once" ? t("worship.cal.recurrence.once") :
                  sched.recurrence.kind === "weekly" ? t("worship.cal.recurrence.weekly", { day: dayFull }) :
                    t("worship.cal.recurrence.monthly", { n: sched.recurrence.weekOfMonth ?? 1, day: dayFull });
              return (
                <div key={sched.id} className="form-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "0.5rem", height: "3rem", borderRadius: "4px", background: worshipTypeColors[sched.type], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{sched.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span>{worshipTypeLabel(sched.type)}</span>
                      <span>•</span>
                      <span>{recLabel}</span>
                      <span>{sched.recurrence.time}</span>
                      <span>•</span>
                      <span>{sched.startDate} ~{sched.endDate ? ` ${sched.endDate}` : ` ${t("worship.cal.dateContinues")}`}</span>
                      {sched.exceptions.length > 0 && <span style={{ color: "#d97706" }}>{t("worship.cal.exceptionsCount", { n: sched.exceptions.length })}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(sched.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                    title={t("worship.cal.deleteScheduleTitle")}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* One-time events list */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("worship.cal.eventsListTitle")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {(() => {
            const events = instances
              .filter((i) => isOneTimeEvent(i.type))
              .sort((a, b) => a.date.localeCompare(b.date));
            if (events.length === 0) {
              return (
                <div className="form-card" style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)" }}>
                  <p style={{ margin: 0 }}>{t("worship.cal.eventsEmpty")}</p>
                </div>
              );
            }
            return events.map((ev) => (
              <div key={ev.id} className="form-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "0.5rem", height: "3rem", borderRadius: "4px", background: worshipTypeColors[ev.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    {ev.title}
                    {!ev.isPublished && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", padding: "2px 6px", background: "#fef3c7", color: "#92400e", borderRadius: "4px" }}>{t("worship.cal.privateBadge")}</span>}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span>{worshipTypeLabel(ev.type)}</span>
                    <span>•</span>
                    <span>{ev.date}{ev.endDate ? ` ~ ${ev.endDate}` : ""}</span>
                    {ev.time && <><span>•</span><span>{ev.time}{ev.endTime ? `~${ev.endTime}` : ""}</span></>}
                    {ev.location && <><span>•</span><span>📍 {ev.location}</span></>}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteInstance(ev.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                  title={t("worship.cal.deleteEventTitle")}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Unified Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: "560px" }}>
            <div className="modal__header">
              <h3 className="modal__title">{t("worship.cal.modal.title")}</h3>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="modal__content">
              {/* 모드 토글 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                {([
                  { key: "schedule" as const, icon: "event_repeat", label: t("worship.cal.modal.tabSchedule"), hint: t("worship.cal.modal.tabScheduleHint") },
                  { key: "event" as const, icon: "event", label: t("worship.cal.modal.tabEvent"), hint: t("worship.cal.modal.tabEventHint") },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAddMode(opt.key)}
                    style={{
                      padding: "0.75rem",
                      border: `1px solid ${addMode === opt.key ? "#16649c" : "#e2e8f0"}`,
                      background: addMode === opt.key ? "#eff6ff" : "white",
                      color: addMode === opt.key ? "#16649c" : "#334155",
                      borderRadius: "10px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.375rem" }}>{opt.icon}</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{opt.hint}</span>
                  </button>
                ))}
              </div>

              {addMode === "event" ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.type")} *</label>
                      <select className="form-select" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as WorshipType }))}>
                        {ONE_TIME_EVENT_TYPES.map((ty) => (
                          <option key={ty} value={ty}>{worshipTypeLabel(ty)}</option>
                        ))}
                        <option value="special">{t("worship.cal.event.typeSpecial")}</option>
                        <option value="other">{t("worship.cal.event.typeOther")}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.published")}</label>
                      <select className="form-select" value={eventForm.isPublished ? "true" : "false"} onChange={(e) => setEventForm((p) => ({ ...p, isPublished: e.target.value === "true" }))}>
                        <option value="true">{t("worship.cal.event.publishedTrue")}</option>
                        <option value="false">{t("worship.cal.event.publishedFalse")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t("worship.cal.event.title")} *</label>
                    <input type="text" className="form-input" placeholder={t("worship.cal.event.titlePlaceholder")}
                      value={eventForm.title || ""}
                      onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.startDate")} *</label>
                      <input type="date" className="form-input" value={eventForm.date || ""} onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.endDate")}</label>
                      <input type="date" className="form-input" value={eventForm.endDate || ""} onChange={(e) => setEventForm((p) => ({ ...p, endDate: e.target.value || undefined }))} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.startTime")}</label>
                      <input type="time" className="form-input" value={eventForm.time || ""} onChange={(e) => setEventForm((p) => ({ ...p, time: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.event.endTime")}</label>
                      <input type="time" className="form-input" value={eventForm.endTime || ""} onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t("worship.cal.event.location")}</label>
                    <input type="text" className="form-input" placeholder={t("worship.cal.event.locationPlaceholder")}
                      value={eventForm.location || ""}
                      onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t("worship.cal.event.description")}</label>
                    <textarea className="form-input" rows={3}
                      placeholder={t("worship.cal.event.descriptionPlaceholder")}
                      value={eventForm.description || ""}
                      onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                      style={{ resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">{t("worship.cal.sched.name")} *</label>
                    <input
                      type="text" className="form-input" placeholder={t("worship.cal.sched.namePlaceholder")}
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.sched.type")}</label>
                      <select className="form-select" value={scheduleForm.type} onChange={(e) => setScheduleForm((p) => ({ ...p, type: e.target.value as WType }))}>
                        {WORSHIP_SCHEDULE_TYPES.map((ty) => (
                          <option key={ty} value={ty}>{worshipTypeLabel(ty)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.sched.time")}</label>
                      <input type="time" className="form-input" value={scheduleForm.recurrence?.time || "11:00"} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, time: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("worship.cal.sched.recurrence")}</label>
                    <select className="form-select" value={scheduleForm.recurrence?.kind} onChange={(e) => {
                      const kind = e.target.value as "once" | "weekly" | "monthly";
                      setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, kind, dayOfWeek: kind !== "once" ? (p.recurrence?.dayOfWeek ?? 0) : undefined } }));
                    }}>
                      <option value="once">{t("worship.cal.sched.recurrenceOnce")}</option>
                      <option value="weekly">{t("worship.cal.sched.recurrenceWeekly")}</option>
                      <option value="monthly">{t("worship.cal.sched.recurrenceMonthly")}</option>
                    </select>
                  </div>
                  {scheduleForm.recurrence?.kind !== "once" && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{t("worship.cal.sched.dayOfWeek")}</label>
                        <select className="form-select" value={scheduleForm.recurrence?.dayOfWeek ?? 0} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, dayOfWeek: parseInt(e.target.value) } }))}>
                          {weekdayKeys.map((k, i) => {
                            const day = t(`worship.cal.weekday.${k}` as any);
                            return <option key={i} value={i}>{locale === "ko" ? t("worship.cal.weekdayLabel", { day }) : day}</option>;
                          })}
                        </select>
                      </div>
                      {scheduleForm.recurrence?.kind === "monthly" && (
                        <div className="form-group">
                          <label className="form-label">{t("worship.cal.sched.weekOfMonth")}</label>
                          <select className="form-select" value={scheduleForm.recurrence?.weekOfMonth ?? 1} onChange={(e) => setScheduleForm((p) => ({ ...p, recurrence: { ...p.recurrence!, weekOfMonth: parseInt(e.target.value) } }))}>
                            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{t("worship.cal.sched.weekOfMonthN", { n })}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t("worship.cal.sched.startDate")} *</label>
                      <input type="date" className="form-input" value={scheduleForm.startDate} onChange={(e) => setScheduleForm((p) => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    {scheduleForm.recurrence?.kind !== "once" && (
                      <div className="form-group">
                        <label className="form-label">{t("worship.cal.sched.endDate")}</label>
                        <input type="date" className="form-input" value={scheduleForm.endDate || ""} onChange={(e) => setScheduleForm((p) => ({ ...p, endDate: e.target.value || undefined }))} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setShowAddModal(false)}>{t("common.cancel")}</button>
              <button className="btn btn--primary" onClick={addMode === "event" ? handleAddEvent : handleAddSchedule}>{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorshipCalendar;
