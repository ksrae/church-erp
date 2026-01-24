import { Link } from "react-router-dom";

function Dashboard() {
  const kpiData = [
    {
      icon: "diversity_3",
      iconClass: "kpi-card__icon--blue",
      label: "지난주 주일예배 출석",
      value: "124",
      unit: "명",
      change: "+5.2%",
      isUp: true,
    },
    {
      icon: "payments",
      iconClass: "kpi-card__icon--indigo",
      label: "금주 헌금 합계",
      value: "₩2,450,000",
      unit: "",
      change: "+2.1%",
      isUp: true,
    },
    {
      icon: "person_add",
      iconClass: "kpi-card__icon--amber",
      label: "새가족 등록",
      value: "3",
      unit: "가정",
      change: "지난주 대비 동일",
      isUp: false,
    },
  ];

  const quickActions = [
    {
      icon: "how_to_reg",
      iconClass: "quick-action-btn__icon--blue",
      title: "성도 등록",
      subtitle: "새가족 카드 작성",
      link: "/members/register",
    },
    {
      icon: "attach_money",
      iconClass: "quick-action-btn__icon--indigo",
      title: "헌금 입력",
      subtitle: "주일/감사 헌금",
      link: "/finance",
    },
    {
      icon: "receipt_long",
      iconClass: "quick-action-btn__icon--green",
      title: "지출 품의",
      subtitle: "전표 및 영수증",
      link: "/finance",
    },
  ];

  const events = [
    {
      month: "10월",
      day: "25",
      title: "수요 기도회",
      time: "19:30 - 21:00 · 본당",
      tag: "예배",
      tagClass: "event-item__tag--worship",
    },
    {
      month: "10월",
      day: "28",
      title: "가을 전교인 체육대회",
      time: "09:00 - 16:00 · 시민 체육관",
      tag: "행사",
      tagClass: "event-item__tag--event",
    },
    {
      month: "10월",
      day: "29",
      title: "주일 연합 예배",
      time: "11:00 - 12:30 · 대예배실",
      tag: "예배",
      tagClass: "event-item__tag--worship",
    },
  ];

  const activities = [
    {
      color: "activity-item__dot--blue",
      text: "<strong>이민수</strong> 성도님 정보가 수정되었습니다.",
      meta: "30분 전 · 교구 관리자",
    },
    {
      color: "activity-item__dot--green",
      text: "<strong>10월 3주차</strong> 헌금 집계가 완료되었습니다.",
      meta: "2시간 전 · 재정부",
    },
    {
      color: "activity-item__dot--amber",
      text: "<strong>박지영</strong> 새가족 등록카드가 접수되었습니다.",
      meta: "어제 · 새가족팀",
    },
    {
      color: "activity-item__dot--purple",
      text: "<strong>유초등부</strong> 예산안 승인 요청.",
      meta: "2일 전 · 교육부서",
    },
  ];

  const chartData = [
    { label: "1주전", height: "60%" },
    { label: "2주전", height: "75%" },
    { label: "3주전", height: "65%" },
    { label: "이번주", height: "85%", active: true },
  ];

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard__welcome">
        <div className="dashboard__welcome-header">
          <div>
            <h1>
              안녕하세요, 김은혜 목사님 <span>👋</span>
            </h1>
            <p>오늘의 교회 현황과 주요 일정을 확인하세요.</p>
          </div>
          <button className="dashboard__download-btn">
            <span className="material-symbols-outlined">download</span>
            주간 보고서 다운로드
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard__kpi-grid">
        {kpiData.map((kpi, index) => (
          <div className="kpi-card" key={index}>
            <div className="kpi-card__header">
              <div className={`kpi-card__icon ${kpi.iconClass}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
              <span
                className={`kpi-card__badge ${kpi.isUp ? "kpi-card__badge--up" : "kpi-card__badge--neutral"
                  }`}
              >
                {kpi.isUp && (
                  <span className="material-symbols-outlined">trending_up</span>
                )}
                {kpi.change}
              </span>
            </div>
            <div className="kpi-card__content">
              <p className="kpi-card__label">{kpi.label}</p>
              <h3 className="kpi-card__value">
                {kpi.value}
                {kpi.unit && <span className="kpi-card__unit">{kpi.unit}</span>}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard__main-grid">
        {/* Left Column */}
        <div className="dashboard__left-column">
          {/* Quick Actions */}
          <div className="quick-actions">
            <h3 className="quick-actions__title">
              <span className="material-symbols-outlined">bolt</span>
              빠른 실행
            </h3>
            <div className="quick-actions__grid">
              {quickActions.map((action, index) => (
                <Link
                  to={action.link}
                  className="quick-action-btn"
                  key={index}
                >
                  <div className={`quick-action-btn__icon ${action.iconClass}`}>
                    <span className="material-symbols-outlined">
                      {action.icon}
                    </span>
                  </div>
                  <div className="quick-action-btn__text">
                    <p className="quick-action-btn__title">{action.title}</p>
                    <p className="quick-action-btn__subtitle">
                      {action.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="events-card">
            <div className="events-card__header">
              <h3 className="events-card__title">
                주요 일정 (Upcoming Events)
              </h3>
              <a href="#" className="events-card__link">
                전체 보기
              </a>
            </div>
            <div className="events-card__list">
              {events.map((event, index) => (
                <div className="event-item" key={index}>
                  <div className="event-item__date">
                    <span className="event-item__date-month">{event.month}</span>
                    <span className="event-item__date-day">{event.day}</span>
                  </div>
                  <div className="event-item__content">
                    <h4 className="event-item__title">{event.title}</h4>
                    <p className="event-item__time">
                      <span className="material-symbols-outlined">schedule</span>
                      {event.time}
                    </p>
                  </div>
                  <span className={`event-item__tag ${event.tagClass}`}>
                    {event.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard__right-column">
          {/* Attendance Chart */}
          <div className="chart-card">
            <div className="chart-card__header">
              <h3 className="chart-card__title">주별 출석 추이</h3>
              <span className="chart-card__label">최근 4주</span>
            </div>
            <div className="chart-card__bars">
              {chartData.map((bar, index) => (
                <div className="chart-bar" key={index}>
                  <div
                    className="chart-bar__fill"
                    style={{
                      height: bar.height,
                      background: bar.active
                        ? "var(--primary)"
                        : `rgba(59, 130, 246, ${0.3 + index * 0.15})`,
                      boxShadow: bar.active
                        ? "0 4px 12px rgba(22, 100, 156, 0.3)"
                        : "none",
                    }}
                  />
                  <span
                    className={`chart-bar__label ${bar.active ? "chart-bar__label--active" : ""
                      }`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <div className="activity-card__header">
              <h3 className="activity-card__title">최근 변동 사항</h3>
            </div>
            <div className="activity-card__list">
              {activities.map((activity, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-item__content">
                    <div className={`activity-item__dot ${activity.color}`} />
                    <div>
                      <p
                        className="activity-item__text"
                        dangerouslySetInnerHTML={{ __html: activity.text }}
                      />
                      <p className="activity-item__meta">{activity.meta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="activity-card__footer">
              <a href="#" className="activity-card__more">
                더 많은 활동 보기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
