import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useMyChurchId } from "../../components/RequireMyChurch";
import { WorshipInstance, worshipTypeLabels, worshipTypeColors, isOneTimeEvent } from "../../types/worship";
import { Church } from "../../types/church";

function Schedule() {
  const myChurchId = useMyChurchId();
  const [church, setChurch] = useState<Church | null>(null);
  const [events, setEvents] = useState<WorshipInstance[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<WorshipInstance | null>(null);

  useEffect(() => {
    if (!myChurchId) return;
    (async () => {
      setIsLoading(true);
      try {
        const chSnap = await getDoc(doc(db, "churches", myChurchId));
        const ch = chSnap.exists() ? ({ id: chSnap.id, ...chSnap.data() } as Church) : null;
        setChurch(ch);

        if (ch && ch.showSchedule === false) {
          setEvents([]);
        } else {
          const snap = await getDocs(query(
            collection(db, "worshipInstances"),
            where("churchId", "==", myChurchId),
            where("isPublished", "==", true),
          ));
          const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipInstance));
          // Portal schedule: show one-time events (worship recurring instances excluded here)
          setEvents(all.filter((i) => isOneTimeEvent(i.type)));
        }
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
      if (e.endDate) return dateStr >= e.date && dateStr <= e.endDate;
      return false;
    });
  };

  const days = getDays();
  const today = new Date().toISOString().split("T")[0];
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const monthEvents = events.filter((e) => {
    const m = `${year}-${String(month + 1).padStart(2, "0")}`;
    return e.date.startsWith(m) || (e.endDate && e.endDate.startsWith(m));
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (church && church.showSchedule === false) {
    return (
      <div className="portal-page-container">
        <div style={{ padding: "3rem", textAlign: "center", background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#64748b" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: "#cbd5e1" }}>event_busy</span>
          <p style={{ marginTop: "0.75rem", fontSize: "0.95rem" }}>이 교회는 아직 일정을 공개하지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>SCHEDULE</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>교회 일정</h1>
        <p style={{ color: "#64748b" }}>공개된 행사 및 이벤트 일정을 확인하세요.</p>
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
                  <div
                    key={e.id}
                    onClick={() => setSelected(e)}
                    style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "3px", marginBottom: "2px", background: worshipTypeColors[e.type] + "22", color: worshipTypeColors[e.type], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                  >
                    {e.title || worshipTypeLabels[e.type]}
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
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              style={{ textAlign: "left", background: "white", borderRadius: "0.875rem", padding: "1rem 1.25rem", border: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "flex-start", cursor: "pointer", width: "100%" }}
            >
              <div style={{ textAlign: "center", minWidth: "2.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "#16649c", lineHeight: 1 }}>{new Date(e.date).getDate()}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{weekDays[new Date(e.date).getDay()]}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: worshipTypeColors[e.type] + "22", color: worshipTypeColors[e.type], fontWeight: 600 }}>
                    {worshipTypeLabels[e.type]}
                  </span>
                  {e.endDate && e.endDate !== e.date && (
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>~ {e.endDate}</span>
                  )}
                </div>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 0.25rem" }}>{e.title || worshipTypeLabels[e.type]}</p>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                  {e.time}{e.endTime ? ` ~ ${e.endTime}` : ""}
                  {e.location && <span style={{ marginLeft: "0.5rem" }}>· {e.location}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EventModal({ event, onClose }: { event: WorshipInstance; onClose: () => void }) {
  const color = worshipTypeColors[event.type];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px", maxWidth: "520px", width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: "12px", background: color + "22", color, fontWeight: 700 }}>
              {worshipTypeLabels[event.type]}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1rem" }}>
            {event.title || worshipTypeLabels[event.type]}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
            <DetailRow icon="event" label="날짜" value={event.endDate && event.endDate !== event.date ? `${event.date} ~ ${event.endDate}` : event.date} />
            {(event.time || event.endTime) && (
              <DetailRow icon="schedule" label="시간" value={`${event.time || ""}${event.endTime ? ` ~ ${event.endTime}` : ""}`} />
            )}
            {event.location && <DetailRow icon="place" label="장소" value={event.location} />}
            {event.preacher && <DetailRow icon="person" label="강사/인도" value={event.preacher} />}
          </div>

          {event.description && (
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "10px", color: "#475569", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {event.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
      <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.1rem", marginTop: "1px" }}>{icon}</span>
      <div>
        <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0, fontWeight: 600, letterSpacing: "0.05em" }}>{label.toUpperCase()}</p>
        <p style={{ fontSize: "0.9rem", color: "#0f172a", margin: "2px 0 0", fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  );
}

export default Schedule;
