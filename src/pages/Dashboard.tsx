import { useState, useEffect } from "react";
import { loadData, saveData } from "../utils/fileStorage";
// Firestore 기반으로 전환됨 (fileStorage.ts 내부에서 처리)


const MEMBERS_STORAGE_KEY = "church_erp_members";

interface DashboardStats {
  totalMembers: number;
  totalIncome: number;
  totalExpense: number;
}



interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  eventEndDate?: string; // 종료 날짜 (기간 설정 시)
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

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalIncome: 0,
    totalExpense: 0,
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState<Partial<CalendarEvent>>({
    title: "",
    date: "",
    eventEndDate: "",
    time: "09:00",
    endTime: "10:00",
    description: "",
    category: "other",
    repeat: "none",
  });

  // 데이터 로드
  useEffect(() => {
    const loadAllData = async () => {
      // 성도 수 로드 (파일 시스템)
      try {
        const membersData = await loadData<unknown[]>("members", "members.json");
        if (membersData && Array.isArray(membersData)) {
          setStats((prev) => ({ ...prev, totalMembers: membersData.length }));
        }
      } catch (error) {
        console.error("Failed to load members:", error);
        // localStorage 폴백
        const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
        if (savedMembers) {
          try {
            const parsed = JSON.parse(savedMembers);
            setStats((prev) => ({ ...prev, totalMembers: parsed.length }));
          } catch { }
        }
      }

      // 재정 데이터 로드 (파일 시스템 - Finance 페이지와 동일한 구조)
      try {
        interface FinanceTransaction {
          type: "income" | "expense";
          amount: number;
        }
        interface FinanceData {
          transactions: FinanceTransaction[];
        }

        const financeData = await loadData<FinanceData>("finance", "finance.json");
        if (financeData && financeData.transactions) {
          const income = financeData.transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          const expense = financeData.transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          setStats((prev) => ({
            ...prev,
            totalIncome: income,
            totalExpense: expense,
          }));
          console.log("✅ Dashboard finance loaded:", { income, expense });
        }
      } catch (error) {
        console.error("Failed to load finance data:", error);
      }

      // 일정 로드 (파일 시스템)
      try {
        const loadedEvents = await loadData<CalendarEvent[]>("events");
        if (loadedEvents) {
          setEvents(loadedEvents);
        } else {
          // 파일이 없으면 localStorage 폴백 확인 (마이그레이션 용도)
          const localEvents = localStorage.getItem("church_erp_events");
          if (localEvents) {
            const parsedLocal = JSON.parse(localEvents);
            setEvents(parsedLocal);
            // 파일로 저장해서 마이그레이션
            await saveData("events", parsedLocal);
          }
        }
      } catch (error) {
        console.error("Failed to load events:", error);
      }
    };

    loadAllData();
  }, []);

  // 일정 저장
  const saveEvents = async (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    try {
      await saveData("events", newEvents);
      // 백업용으로 localStorage에도 저장? 선택사항. 여기서는 제거.
    } catch (error) {
      console.error("Failed to save events:", error);
      alert("일정 저장 중 오류가 발생했습니다.");
    }
  };

  // 금액 포맷팅
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return "₩0";
    if (amount >= 10000) {
      return `₩${(amount / 10000).toLocaleString("ko-KR")}만`;
    }
    return `₩${amount.toLocaleString("ko-KR")}`;
  };

  // 캘린더 관련 함수들
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayIndex = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // 이전 달 날짜
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // 다음 달 날짜 (6주 채우기)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter((event) => {
      // 1. 단일 날짜 일치
      if (event.date === dateStr) return true;

      // 2. 기간 일정 (반복이 없을 때만 적용)
      if (event.repeat === "none" && event.eventEndDate) {
        return dateStr >= event.date && dateStr <= event.eventEndDate;
      }

      // 3. 반복 일정 처리 (기존 로직 유지)
      if (event.repeat !== "none") {
        const eventDate = new Date(event.date);
        const checkDate = new Date(dateStr);
        if (event.repeat === "weekly") {
          return eventDate.getDay() === checkDate.getDay() && checkDate >= eventDate;
        }
        if (event.repeat === "monthly") {
          return eventDate.getDate() === checkDate.getDate() && checkDate >= eventDate;
        }
        if (event.repeat === "yearly") {
          return (
            eventDate.getMonth() === checkDate.getMonth() &&
            eventDate.getDate() === checkDate.getDate() &&
            checkDate >= eventDate
          );
        }
      }
      return false;
    });
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 일정 추가/수정 모달 열기
  const openEventModal = (date?: string, event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        date: event.date,
        eventEndDate: event.eventEndDate || "",
        time: event.time,
        endTime: event.endTime,
        description: event.description,
        category: event.category,
        repeat: event.repeat,
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: "",
        date: date || formatDateKey(new Date()),
        eventEndDate: "",
        time: "09:00",
        endTime: "10:00",
        description: "",
        category: "other",
        repeat: "none",
      });
    }
    setShowEventModal(true);
  };

  // 일정 저장
  const handleSaveEvent = () => {
    if (!eventForm.title || !eventForm.date) {
      alert("제목과 날짜를 입력해주세요.");
      return;
    }

    // 종료 날짜가 시작 날짜보다 앞서면 경고
    if (eventForm.eventEndDate && eventForm.eventEndDate < eventForm.date) {
      alert("종료 날짜는 시작 날짜보다 이후여야 합니다.");
      return;
    }

    const newEvent: CalendarEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title: eventForm.title || "",
      date: eventForm.date || "",
      eventEndDate: eventForm.eventEndDate,
      time: eventForm.time || "09:00",
      endTime: eventForm.endTime,
      description: eventForm.description || "",
      category: eventForm.category || "other",
      repeat: eventForm.repeat || "none",
    };

    let updatedEvents: CalendarEvent[];
    if (editingEvent) {
      updatedEvents = events.map((e) => (e.id === editingEvent.id ? newEvent : e));
    } else {
      updatedEvents = [...events, newEvent];
    }

    saveEvents(updatedEvents);
    setShowEventModal(false);
  };

  // 일정 삭제
  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter((e) => e.id !== eventId);
    saveEvents(updatedEvents);
    setSelectedDate(null);
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 선택된 날짜의 일정
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="dashboard">
      {/* KPI Cards */}
      <div className="dashboard__kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--blue">
            <span className="material-symbols-outlined">diversity_3</span>
          </div>
          <div className="kpi-card__content">
            <p className="kpi-card__label">등록 성도</p>
            <h3 className="kpi-card__value">
              {stats.totalMembers}
              <span className="kpi-card__unit">명</span>
            </h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--indigo">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="kpi-card__content">
            <p className="kpi-card__label">총 수입</p>
            <h3 className="kpi-card__value">{formatCurrency(stats.totalIncome)}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--amber">
            <span className="material-symbols-outlined">receipt_long</span>
          </div>
          <div className="kpi-card__content">
            <p className="kpi-card__label">총 지출</p>
            <h3 className="kpi-card__value">{formatCurrency(stats.totalExpense)}</h3>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="dashboard__main-grid">
        <div className="dashboard__left-column">
          <div className="calendar-card">
            <div className="calendar-card__header">
              <h3 className="calendar-card__title">
                <span className="material-symbols-outlined">calendar_month</span>
                일정 관리
              </h3>
              <div className="calendar-card__nav">
                <button onClick={() => navigateMonth(-1)}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="calendar-card__month">
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </span>
                <button onClick={() => navigateMonth(1)}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <button className="calendar-card__add-btn" onClick={() => openEventModal()}>
                <span className="material-symbols-outlined">add</span>
                일정 추가
              </button>
            </div>

            <div className="calendar-grid">
              {/* Week Header */}
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className={`calendar-grid__weekday ${i === 0 ? "sunday" : ""} ${i === 6 ? "saturday" : ""}`}
                >
                  {day}
                </div>
              ))}

              {/* Days */}
              {days.map((day, index) => {
                const dateKey = formatDateKey(day.date);
                const dayEvents = getEventsForDate(dateKey);
                const dayOfWeek = day.date.getDay();

                return (
                  <div
                    key={index}
                    className={`calendar-grid__day ${!day.isCurrentMonth ? "other-month" : ""} ${isToday(day.date) ? "today" : ""
                      } ${selectedDate === dateKey ? "selected" : ""}`}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span
                      className={`calendar-grid__day-number ${dayOfWeek === 0 ? "sunday" : ""} ${dayOfWeek === 6 ? "saturday" : ""
                        }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="calendar-grid__events">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="calendar-grid__event"
                            style={{
                              backgroundColor: categoryColors[event.category].bg,
                              color: categoryColors[event.category].text,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventModal(undefined, event);
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="calendar-grid__more">+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Selected Date Events */}
        <div className="dashboard__right-column">
          <div className="events-list-card">
            <div className="events-list-card__header">
              <h3 className="events-list-card__title">
                {selectedDate
                  ? `${new Date(selectedDate).getMonth() + 1}월 ${new Date(selectedDate).getDate()}일 일정`
                  : "오늘 일정"}
              </h3>
              {selectedDate && (
                <button
                  className="events-list-card__add"
                  onClick={() => openEventModal(selectedDate)}
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              )}
            </div>

            <div className="events-list-card__content">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => (
                  <div key={event.id} className="event-list-item">
                    <div
                      className="event-list-item__indicator"
                      style={{ backgroundColor: categoryColors[event.category].text }}
                    />
                    <div className="event-list-item__content">
                      <div className="event-list-item__header">
                        <h4 className="event-list-item__title">{event.title}</h4>
                        <span
                          className="event-list-item__category"
                          style={{
                            backgroundColor: categoryColors[event.category].bg,
                            color: categoryColors[event.category].text,
                          }}
                        >
                          {categoryColors[event.category].label}
                        </span>
                      </div>
                      <p className="event-list-item__time">
                        <span className="material-symbols-outlined">schedule</span>
                        {event.time}
                        {event.endTime && ` - ${event.endTime}`}
                        {event.repeat !== "none" && (
                          <span className="event-list-item__repeat">
                            <span className="material-symbols-outlined">repeat</span>
                            {event.repeat === "weekly" && "매주"}
                            {event.repeat === "monthly" && "매월"}
                            {event.repeat === "yearly" && "매년"}
                          </span>
                        )}
                      </p>
                      {event.description && (
                        <p className="event-list-item__description">{event.description}</p>
                      )}
                    </div>
                    <div className="event-list-item__actions">
                      <button
                        onClick={() => openEventModal(undefined, event)}
                        title="수정"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("정말 이 일정을 삭제하시겠습니까?")) {
                            handleDeleteEvent(event.id);
                          }
                        }}
                        title="삭제"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="events-list-card__empty">
                  <span className="material-symbols-outlined">event_busy</span>
                  <p>등록된 일정이 없습니다.</p>
                  {selectedDate && (
                    <button onClick={() => openEventModal(selectedDate)}>
                      일정 추가하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="chart-card" style={{ marginTop: "1rem" }}>
            <div className="chart-card__header">
              <h3 className="chart-card__title">이번 달 일정 요약</h3>
            </div>
            <div style={{ padding: "1rem" }}>
              {Object.entries(categoryColors).map(([key, value]) => {
                const count = events.filter(
                  (e) =>
                    e.category === key &&
                    new Date(e.date).getMonth() === currentDate.getMonth() &&
                    new Date(e.date).getFullYear() === currentDate.getFullYear()
                ).length;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          width: "0.75rem",
                          height: "0.75rem",
                          borderRadius: "50%",
                          backgroundColor: value.text,
                        }}
                      />
                      <span>{value.label}</span>
                    </div>
                    <strong>{count}개</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingEvent ? "일정 수정" : "새 일정 추가"}
              </h2>
              <button className="modal__close" onClick={() => setShowEventModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal__content">
              <div className="form-group">
                <label className="form-label">
                  제목 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="일정 제목을 입력하세요"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    일시 <span className="required">*</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      color: eventForm.repeat !== "none" ? "#9ca3af" : "var(--text-primary)",
                      cursor: eventForm.repeat !== "none" ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!eventForm.eventEndDate}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEventForm({ ...eventForm, eventEndDate: eventForm.date });
                        } else {
                          setEventForm({ ...eventForm, eventEndDate: "" });
                        }
                      }}
                      disabled={eventForm.repeat !== "none"}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    기간 설정
                  </label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="date"
                    className="form-input"
                    value={eventForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      // 만약 종료 날짜가 있고 시작 날짜가 종료 날짜보다 뒤라면 종료 날짜도 이동
                      if (eventForm.eventEndDate && eventForm.eventEndDate < newDate) {
                        setEventForm({ ...eventForm, date: newDate, eventEndDate: newDate });
                      } else {
                        setEventForm({ ...eventForm, date: newDate });
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  {eventForm.eventEndDate && (
                    <>
                      <span style={{ color: "var(--text-secondary)" }}>~</span>
                      <input
                        type="date"
                        className="form-input"
                        value={eventForm.eventEndDate}
                        onChange={(e) => setEventForm({ ...eventForm, eventEndDate: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">시작 시간</label>
                  <input
                    type="time"
                    className="form-input"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">종료 시간</label>
                  <input
                    type="time"
                    className="form-input"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">카테고리</label>
                  <select
                    className="form-select"
                    value={eventForm.category}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, category: e.target.value as CalendarEvent["category"] })
                    }
                  >
                    <option value="worship">예배</option>
                    <option value="meeting">모임</option>
                    <option value="event">행사</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">반복</label>
                  <select
                    className="form-select"
                    value={eventForm.repeat}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, repeat: e.target.value as CalendarEvent["repeat"] })
                    }
                  >
                    <option value="none">반복 안함</option>
                    <option value="weekly">매주</option>
                    <option value="monthly">매월</option>
                    <option value="yearly">매년</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">설명</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="일정에 대한 설명을 입력하세요"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="modal__footer" style={{ justifyContent: "space-between" }}>
              <div>
                {editingEvent && (
                  <button
                    className="btn btn--danger btn--outline"
                    onClick={() => {
                      if (confirm("정말 이 일정을 삭제하시겠습니까?")) {
                        handleDeleteEvent(editingEvent.id);
                        setShowEventModal(false);
                      }
                    }}
                    style={{ color: "#ef4444", borderColor: "#ef4444" }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    삭제
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn--outline" onClick={() => setShowEventModal(false)}>
                  취소
                </button>
                <button className="btn btn--primary" onClick={handleSaveEvent}>
                  <span className="material-symbols-outlined">check</span>
                  {editingEvent ? "수정" : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
