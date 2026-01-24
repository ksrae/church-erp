function Resources() {
  const filters = [
    { name: "주일 예배", checked: true },
    { name: "수요 기도회", checked: false },
    { name: "교육 부서", checked: false },
    { name: "주보/행사", checked: false },
  ];

  const resources = [
    {
      image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=300&fit=crop",
      tag: "주일 2부",
      duration: "45:20",
      date: "2023.10.29",
      title: "믿음의 여정: 광야를 지나 약속의 땅으로",
      description: "출애굽기 강해 14회(진1, 그날 속에서 찾아내는 믿음의 빛...",
      author: "이상민 목사",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop",
      isNew: true,
    },
    {
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
      tag: "주보",
      date: "2023.10.29",
      title: "10월 5주차 주일 주보",
      description: "예배 순서 안내 사항 주간 일정 및 기도제목...",
      author: "자무국",
      avatar: "",
      isNew: false,
    },
    {
      image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=400&h=300&fit=crop",
      tag: "수요 기도회",
      date: "2023.10.25",
      title: "산상수훈 강해 (12)",
      description: "마음이 청결한 자는 복이 있나니 그들은 하나님을 볼것임이요...",
      author: "김형수 전도사",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
      isNew: false,
    },
    {
      image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&h=300&fit=crop",
      tag: "교육 부서",
      date: "2023.10.22",
      title: "2023 가을 소풍 사진 모음",
      description: "유치부 가을 소풍 활동 사진입니다. 아이들의 밝은 모습을...",
      author: "유지부",
      avatar: "",
      isNew: false,
    },
    {
      image: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400&h=300&fit=crop",
      tag: "행사 새벽기도",
      date: "2023.10.15",
      title: "가을 특별 새벽기도회 (5일차)",
      description: "주제: 다시 기도로 일어서라. 본문: 느헤미야 1장...",
      author: "이상민 목사",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop",
      isNew: false,
    },
  ];

  return (
    <div className="resources-page">
      {/* Sidebar */}
      <aside className="resources-sidebar">
        <div className="resources-sidebar__section">
          <h3 className="resources-sidebar__title">MAIN MENU</h3>
          <nav className="resources-nav">
            <a className="resources-nav__item" href="#">
              <span className="material-symbols-outlined">dashboard</span>
              대시보드
            </a>
            <a className="resources-nav__item" href="#">
              <span className="material-symbols-outlined">groups</span>
              교인 관리
            </a>
            <a className="resources-nav__item active" href="#">
              <span className="material-symbols-outlined">folder_open</span>
              자료실 관리
            </a>
            <a className="resources-nav__item" href="#">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              재정 관리
            </a>
          </nav>
        </div>

        <div className="resources-sidebar__section" style={{ marginTop: "1.5rem" }}>
          <h3 className="resources-sidebar__title">자료실 필터</h3>
          <nav className="resources-nav">
            {filters.map((filter, index) => (
              <label className="resources-nav__item" key={index} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="resources-nav__checkbox"
                  defaultChecked={filter.checked}
                />
                {filter.name}
              </label>
            ))}
          </nav>
        </div>

        <div className="resources-sidebar__section" style={{ marginTop: "1.5rem" }}>
          <h3 className="resources-sidebar__title">날짜 범위</h3>
          <nav className="resources-nav">
            <span className="resources-nav__item" style={{ fontSize: "0.75rem", color: "#64748b" }}>
              📅 2023.01 - 2023.12
            </span>
          </nav>
        </div>

        <div className="resources-sidebar__section" style={{ marginTop: "1.5rem" }}>
          <h3 className="resources-sidebar__title">첨부 형식</h3>
          <nav className="resources-nav">
            <label className="resources-nav__item" style={{ cursor: "pointer" }}>
              <input type="checkbox" className="resources-nav__checkbox" defaultChecked />
              Video
            </label>
            <label className="resources-nav__item" style={{ cursor: "pointer" }}>
              <input type="checkbox" className="resources-nav__checkbox" defaultChecked />
              PDF
            </label>
          </nav>
        </div>

        {/* User Section */}
        <div style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "var(--radius-full)",
                background: "#e2e8f0",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: "url('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop')",
              }}
            />
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>김목사 (Admin)</p>
              <p style={{ fontSize: "0.75rem", color: "#64748b" }}>설정 및 로그아웃</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="resources-content">
        <div className="resources-content__header">
          <h1 className="resources-content__title">설교 및 사역 자료실</h1>
          <p className="resources-content__subtitle">
            지난 설교 영상, 주보, 교육 자료를 안전하게 보관하고 관리합니다.
          </p>
          <div className="resources-content__actions">
            <div className="resources-view-toggle">
              <button className="resources-view-btn active">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button className="resources-view-btn">
                <span className="material-symbols-outlined">view_list</span>
              </button>
            </div>
            <button className="resources-add-btn">
              <span className="material-symbols-outlined">add</span>
              새 자료 등록
            </button>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="resources-grid">
          {resources.map((resource, index) => (
            <div className="resource-card" key={index}>
              <div
                className="resource-card__image"
                style={{ backgroundImage: `url('${resource.image}')` }}
              >
                <span className="resource-card__tag">{resource.tag}</span>
                {resource.isNew && <span className="resource-card__new">NEW</span>}
                {resource.duration && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(0,0,0,0.7)",
                      color: "white",
                      fontSize: "0.625rem",
                      padding: "0.125rem 0.375rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {resource.duration}
                  </span>
                )}
              </div>
              <div className="resource-card__content">
                <p className="resource-card__date">{resource.date}</p>
                <h3 className="resource-card__title">{resource.title}</h3>
                <p className="resource-card__description">{resource.description}</p>
              </div>
              <div className="resource-card__footer">
                {resource.avatar ? (
                  <div
                    className="resource-card__author-avatar"
                    style={{ backgroundImage: `url('${resource.avatar}')` }}
                  />
                ) : (
                  <div
                    className="resource-card__author-avatar"
                    style={{ background: "#e2e8f0" }}
                  />
                )}
                <span className="resource-card__author-name">{resource.author}</span>
                <div className="resource-card__actions">
                  <button className="resource-card__action-btn">
                    <span className="material-symbols-outlined">download</span>
                  </button>
                  <button className="resource-card__action-btn">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div className="add-resource-card">
            <div className="add-resource-card__icon">
              <span className="material-symbols-outlined">add</span>
            </div>
            <h3 className="add-resource-card__title">새 자료 추가</h3>
            <p className="add-resource-card__text">
              설교 영상, 주보 또는 이미지<br />자료를 드래그하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Resources;
