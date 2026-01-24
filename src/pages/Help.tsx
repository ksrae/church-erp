function Help() {
  const categories = [
    {
      icon: "menu_book",
      title: "사용자 가이드",
      description: "시스템 사용법을 단계별로 자세히 안내해 드립니다. 처음 오셨다면 확인해보세요.",
    },
    {
      icon: "help",
      title: "자주 묻는 질문",
      description: "많은 사용자들이 궁금해하는 질문과 답변을 모았습니다. 빠르게 해결책을...",
    },
    {
      icon: "forum",
      title: "온라인 문의",
      description: "해결되지 않는 문제가 있으신가요? 1:1 문의를 남겨주시면 신속히 답변 드립니다.",
    },
    {
      icon: "support_agent",
      title: "원격 지원",
      description: "전문 상담원이 고객님의 PC화면을 보며 직접 문제를 진단하고 해결해 드립니다.",
    },
  ];

  const notices = [
    {
      tag: "긴급 공지",
      tagClass: "notice-item__tag--urgent",
      title: "[안내] 2023년 10월 시스템 정기 점검 안내 (10/25 00:00~06:00)",
      date: "2023-18-20",
    },
    {
      tag: "업데이트",
      tagClass: "notice-item__tag--update",
      title: "[기능 추가] 연말정산 기부금 영수증 일괄 출력 기능 오픈",
      date: "2023-18-15",
    },
    {
      tag: "일반",
      tagClass: "notice-item__tag--notice",
      title: "[공지] 개인정보처리방침 변경 안내",
      date: "2023-18-01",
    },
  ];

  return (
    <div className="help-page">
      {/* Hero Section */}
      <section className="help-hero">
        <h1 className="help-hero__title">무엇을 도와드릴까요?</h1>
        <p className="help-hero__subtitle">
          교회 관리 시스템 사용 중 궁금한 점을 검색해보세요.
        </p>

        <div className="help-search">
          <input
            type="text"
            className="help-search__input"
            placeholder="검색어를 입력하세요 (예: 교인 등록, 헌금 영수증...)"
          />
          <button className="help-search__btn">검색</button>
        </div>

        <div className="help-search__suggestions">
          <span style={{ marginRight: "0.5rem" }}>추천 검색어:</span>
          <a href="#" className="help-search__suggestion">새가족 등록</a>
          <span>·</span>
          <a href="#" className="help-search__suggestion">연말정산</a>
          <span>·</span>
          <a href="#" className="help-search__suggestion">비밀번호 변경</a>
        </div>
      </section>

      {/* Content */}
      <div className="help-content">
        {/* Categories */}
        <section className="help-categories">
          <h2 className="help-categories__title">도움말 카테고리</h2>
          <p className="help-categories__subtitle">원하시는 서비스를 선택해주세요.</p>

          <div className="help-categories__grid">
            {categories.map((category, index) => (
              <div className="help-category-card" key={index}>
                <div className="help-category-card__icon">
                  <span className="material-symbols-outlined">{category.icon}</span>
                </div>
                <h3 className="help-category-card__title">{category.title}</h3>
                <p className="help-category-card__description">{category.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Section */}
        <div className="help-bottom">
          {/* Notices */}
          <section className="help-notices">
            <div className="help-notices__header">
              <h3 className="help-notices__title">최신 공지사항</h3>
              <a href="#" className="help-notices__link">전체보기 &gt;</a>
            </div>
            <div className="help-notices__list">
              {notices.map((notice, index) => (
                <div className="notice-item" key={index}>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <span className={`notice-item__tag ${notice.tagClass}`}>{notice.tag}</span>
                    <span className="notice-item__title">{notice.title}</span>
                  </div>
                  <span className="notice-item__date">{notice.date}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="help-contact">
            <h3 className="help-contact__title">고객센터 운영시간</h3>

            <div className="help-contact__item">
              <div className="help-contact__icon">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <p className="help-contact__label">평일 (월~금)</p>
                <p className="help-contact__text">09:00 ~ 18:00 (점심시간 12:00~13:00)</p>
              </div>
            </div>

            <div className="help-contact__item">
              <div className="help-contact__icon">
                <span className="material-symbols-outlined">event_busy</span>
              </div>
              <div>
                <p className="help-contact__label">주말 및 공휴일</p>
                <p className="help-contact__text">휴무 (고객 서버 장애 접수만 가능)</p>
              </div>
            </div>

            <div className="help-contact__item">
              <div className="help-contact__icon">
                <span className="material-symbols-outlined">call</span>
              </div>
              <div>
                <p className="help-contact__label">대표 전화</p>
                <p className="help-contact__phone">1588-0000</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="help-footer">
        <p className="help-footer__copyright">© 2023 Church ERP System. All rights reserved.</p>
        <div className="help-footer__links">
          <a href="#" className="help-footer__link">이용약관</a>
          <a href="#" className="help-footer__link">개인정보...</a>
        </div>
      </footer>
    </div>
  );
}

export default Help;
