import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useMyChurchId } from "../../components/RequireMyChurch";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  eventEndDate?: string;
  time: string;
  endTime?: string;
  description: string;
  category: "worship" | "meeting" | "event" | "other";
  repeat: "none" | "weekly" | "monthly" | "yearly";
}

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  worship: { bg: "#dbeafe", text: "#1d4ed8", label: "예배" },
  meeting: { bg: "#dcfce7", text: "#16a34a", label: "모임" },
  event: { bg: "#fef3c7", text: "#d97706", label: "행사" },
  other: { bg: "#f3e8ff", text: "#7c3aed", label: "기타" },
};

function Schedule() {
  const myChurchId = useMyChurchId();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!myChurchId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "churchData", myChurchId, "events"));
        if (snap.exists()) setEvents((snap.data().value as CalendarEvent[]) || []);
      } catch (e) { console.error(e); }
      setIsLoading(false);
    })();
  }, [myChurchId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay.getDay() - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return days;
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => {
      if (e.date === dateStr) return true;
      if (e.repeat === "none" && e.eventEndDate) return dateStr >= e.date && dateStr <= e.eventEndDate;
      if (e.repeat !== "none") {
        const ed = new Date(e.date);
        const cd = new Date(dateStr);
        if (e.repeat === "weekly") return ed.getDay() === cd.getDay() && cd >= ed;
        if (e.repeat === "monthly") return ed.getDate() === cd.getDate() && cd >= ed;
        if (e.repeat === "yearly") return ed.getMonth() === cd.getMonth() && ed.getDate() === cd.getDate() && cd >= ed;
      }
      return false;
    });
  };

  const days = getDays();
  const today = new Date().toISOString().split("T")[0];
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const monthEvents = events.filter((e) => {
    const m = `${year}-${String(month + 1).padStart(2, "0")}`;
    return e.date.startsWith(m);
  }).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>SCHEDULE</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>교회 일정</h1>
        <p style={{ color: "#64748b" }}>예배, 모임, 행사 일정을 확인하세요.</p>
      </div>

      {/* Calendar */}
      <div style={{ background: "white", borderRadius: "1rem", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 style={{ fontWeight: 700, fontSize: "1.125rem" }}>{year}년 {month + 1}월</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {weekDays.map((d, i) => (
            <div key={d} style={{ padding: "0.5rem", textAlign: "center", fontSize: "0.8rem", fontWeight: 600, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#64748b", borderBottom: "1px solid #f1f5f9" }}>
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            const dateStr = day.date.toISOString().split("T")[0];
            const dayEvents = getEventsForDate(dateStr);
            const isToday = dateStr === today;
            const dow = day.date.getDay();
            return (
              <div key={idx} style={{ minHeight: "4.5rem", padding: "0.375rem", borderRight: "1px solid #f8fafc", borderBottom: "1px solid #f8fafc", opacity: day.isCurrentMonth ? 1 : 0.35, background: isToday ? "#eff6ff" : "white" }}>
                <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isToday ? "#16649c" : "transparent", color: isToday ? "white" : dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "#1e293b", fontSize: "0.8rem", fontWeight: isToday ? 700 : 400, marginBottom: "0.25rem" }}>
                  {day.date.getDate()}
                </div>
                {dayEvents.slice(0, 2).map((e) => (
                  <div key={e.id} style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "3px", marginBottom: "2px", background: categoryColors[e.category].bg, color: categoryColors[e.category].text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>+{dayEvents.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event List */}
      <h3 style={{ fontWeight: 700, marginBottom: "1rem", color: "#1e293b" }}>{month + 1}월 일정</h3>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>불러오는 중...</div>
      ) : monthEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>이번 달 등록된 일정이 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {monthEvents.map((e) => (
            <div key={e.id} style={{ background: "white", borderRadius: "0.875rem", padding: "1rem 1.25rem", border: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ textAlign: "center", minWidth: "2.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "#16649c", lineHeight: 1 }}>{new Date(e.date).getDate()}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{weekDays[new Date(e.date).getDay()]}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: categoryColors[e.category].bg, color: categoryColors[e.category].text, fontWeight: 600 }}>
                    {categoryColors[e.category].label}
                  </span>
                  {e.repeat !== "none" && (
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "2px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>repeat</span>
                      {e.repeat === "weekly" ? "매주" : e.repeat === "monthly" ? "매월" : "매년"}
                    </span>
                  )}
                </div>
                <p style={{ fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>{e.title}</p>
                <p style={{ fontSize: "0.8rem", color: "#64748b" }}>{e.time}{e.endTime ? ` ~ ${e.endTime}` : ""}</p>
                {e.description && <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>{e.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Schedule;
