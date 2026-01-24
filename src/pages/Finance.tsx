function Finance() {
  const ledgerData = [
    {
      code: "1101",
      name: "현금 및 현금성자산",
      subName: "보통예금 (농협)",
      dot: "account-cell__dot--blue",
      opening: "150,000,000",
      income: "45,200,000",
      expense: "12,850,000",
      closing: "182,350,000",
    },
    {
      code: "4101",
      name: "십일조 헌금",
      subName: "",
      dot: "account-cell__dot--green",
      opening: "0",
      income: "25,450,000",
      expense: "0",
      closing: "25,450,000",
    },
    {
      code: "4102",
      name: "감사 헌금",
      subName: "",
      dot: "account-cell__dot--green",
      opening: "0",
      income: "12,500,000",
      expense: "0",
      closing: "12,500,000",
    },
    {
      code: "5101",
      name: "목회자 사례비",
      subName: "",
      dot: "account-cell__dot--rose",
      opening: "0",
      income: "0",
      expense: "8,500,000",
      closing: "-8,500,000",
    },
    {
      code: "5205",
      name: "교회 관리비",
      subName: "전기세, 수도세, 수선비",
      dot: "account-cell__dot--rose",
      opening: "0",
      income: "0",
      expense: "2,350,000",
      closing: "-2,350,000",
    },
    {
      code: "5301",
      name: "선교 후원금",
      subName: "국내외 선교지 지원",
      dot: "account-cell__dot--rose",
      opening: "0",
      income: "0",
      expense: "2,000,000",
      closing: "-2,000,000",
    },
  ];

  const chartData = [
    { week: "1주", income: 65, expense: 30 },
    { week: "2주", income: 45, expense: 25 },
    { week: "3주", income: 55, expense: 40 },
    { week: "4주", income: 80, expense: 20 },
    { week: "5주", income: 35, expense: 15 },
  ];

  return (
    <div className="finance-page">
      {/* Sidebar */}
      <aside className="finance-sidebar">
        <div className="finance-sidebar__header">
          <div className="finance-sidebar__logo" />
          <div>
            <h1 className="finance-sidebar__title">은혜교회</h1>
            <p className="finance-sidebar__subtitle">ERP System</p>
          </div>
        </div>

        <nav className="finance-nav">
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">group</span>
            <span>교인 관리</span>
          </a>
          <a className="finance-nav__item active" href="#">
            <span className="material-symbols-outlined filled">account_balance_wallet</span>
            <span>재정 관리</span>
          </a>
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">calendar_month</span>
            <span>일정 관리</span>
          </a>
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">folder_open</span>
            <span>행정 문서</span>
          </a>
          <div className="finance-nav__divider" />
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span>설정</span>
          </a>
        </nav>

        <div className="finance-sidebar__user">
          <div
            className="finance-sidebar__user-avatar"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop')",
            }}
          />
          <div>
            <p className="finance-sidebar__user-name">김철수 장로</p>
            <p className="finance-sidebar__user-role">재정부장</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="finance-content">
        <header className="finance-header">
          <h2 className="finance-header__title">총계정원장 및 재무 보고서</h2>
          <div className="finance-header__actions">
            <span className="finance-header__badge">2024년 5월 결산</span>
            <button style={{ color: "#9ca3af" }}>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button style={{ color: "#9ca3af" }}>
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        <div className="finance-main">
          <div className="finance-main__inner">
            {/* Stats Grid */}
            <div className="finance-stats">
              {/* Left Stats */}
              <div className="finance-stats__left">
                <div className="stat-card">
                  <div className="stat-card__decoration stat-card__decoration--blue" />
                  <div className="stat-card__header">
                    <span className="stat-card__icon stat-card__icon--blue">
                      <span className="material-symbols-outlined">account_balance</span>
                    </span>
                    <span className="stat-card__label">유동 자산 합계</span>
                  </div>
                  <div className="stat-card__value-wrapper">
                    <span className="stat-card__value">₩ 182,350,000</span>
                    <span className="stat-card__change stat-card__change--up">전월비 +3.2%</span>
                  </div>
                  <p className="stat-card__note">현금 및 보통 예금 포함</p>
                </div>

                <div className="stat-card">
                  <div className="stat-card__decoration stat-card__decoration--green" />
                  <div className="stat-card__header">
                    <span className="stat-card__icon stat-card__icon--green">
                      <span className="material-symbols-outlined">trending_up</span>
                    </span>
                    <span className="stat-card__label">당기 순이익 (5월)</span>
                  </div>
                  <div className="stat-card__value-wrapper">
                    <span className="stat-card__value">₩ 32,350,000</span>
                    <span className="stat-card__change stat-card__change--green">+12.5%</span>
                  </div>
                  <p className="stat-card__note">수입 45.2M / 지출 12.8M</p>
                </div>

                <div className="budget-card">
                  <div className="budget-card__decoration">
                    <span className="material-symbols-outlined">pie_chart</span>
                  </div>
                  <span className="budget-card__label">연간 예산 집행률</span>
                  <span className="budget-card__value">42.5%</span>
                  <div className="budget-card__progress">
                    <div className="budget-card__progress-fill" style={{ width: "42.5%" }} />
                  </div>
                  <span className="budget-card__note">전체 예산 5억원 중 2.1억원 집행</span>
                </div>
              </div>

              {/* Chart */}
              <div className="finance-stats__right">
                <div className="finance-chart-card">
                  <div className="finance-chart-card__header">
                    <div>
                      <h3 className="finance-chart-card__title">월간 재정 흐름 (Monthly Flow)</h3>
                      <p className="finance-chart-card__subtitle">2024년 5월 - 주간 수입/지출 비교</p>
                    </div>
                    <div className="finance-chart-card__legend">
                      <div className="legend-item">
                        <span className="legend-item__dot legend-item__dot--income" />
                        <span className="legend-item__text">수입 (Income)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-item__dot legend-item__dot--expense" />
                        <span className="legend-item__text">지출 (Expense)</span>
                      </div>
                    </div>
                  </div>
                  <div className="finance-chart-card__chart">
                    <div className="chart-grid-lines">
                      <div className="chart-grid-line" />
                      <div className="chart-grid-line" />
                      <div className="chart-grid-line" />
                      <div className="chart-grid-line" />
                      <div className="chart-grid-line" />
                    </div>
                    {chartData.map((data, index) => (
                      <div className="chart-bar-group" key={index}>
                        <div className="chart-bars">
                          <div
                            className="chart-bar-item chart-bar-item--income"
                            style={{ height: `${data.income}%` }}
                          />
                          <div
                            className="chart-bar-item chart-bar-item--expense"
                            style={{ height: `${data.expense}%` }}
                          />
                        </div>
                        <span className="chart-bar-label">{data.week}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <section className="ledger-section">
              <div className="ledger-header">
                <div>
                  <h2 className="ledger-header__title">총계정원장 (General Ledger)</h2>
                  <p className="ledger-header__subtitle">
                    지정된 기간 동안의 모든 계정 잔액 및 상세 내역을 조회합니다.
                  </p>
                </div>
                <div className="ledger-header__controls">
                  <div className="ledger-date-picker">
                    <input type="date" defaultValue="2024-05-01" />
                    <span>~</span>
                    <input type="date" defaultValue="2024-05-31" />
                  </div>
                  <select className="ledger-select">
                    <option>전체 계정 (All)</option>
                    <option>자산 (Assets)</option>
                    <option>부채 (Liabilities)</option>
                    <option>수입 (Income)</option>
                    <option>지출 (Expenses)</option>
                  </select>
                  <div style={{ width: "1px", height: "2rem", background: "var(--border-color)" }} />
                  <button className="ledger-export-btn">
                    <span className="material-symbols-outlined pdf">picture_as_pdf</span>
                    PDF
                  </button>
                  <button className="ledger-export-btn">
                    <span className="material-symbols-outlined excel">table_view</span>
                    Excel
                  </button>
                </div>
              </div>

              <div className="ledger-table-wrapper">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th style={{ width: "6rem" }}>계정코드</th>
                      <th style={{ minWidth: "12.5rem" }}>계정명 (Account Name)</th>
                      <th className="text-right bg-highlight">기초잔액</th>
                      <th className="text-right text-income">수입(차변)</th>
                      <th className="text-right text-expense">지출(대변)</th>
                      <th className="text-right bg-highlight">기말잔액</th>
                      <th className="text-center" style={{ width: "6rem" }}>상세보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((row, index) => (
                      <tr key={index}>
                        <td className="code">{row.code}</td>
                        <td>
                          <div className="account-cell">
                            <div className="account-cell__name">
                              <div className={`account-cell__dot ${row.dot}`} />
                              <span className="account-cell__title">{row.name}</span>
                            </div>
                            {row.subName && (
                              <span className="account-cell__sub">{row.subName}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right bg-highlight">{row.opening}</td>
                        <td className="text-right income">{row.income}</td>
                        <td className="text-right expense">{row.expense}</td>
                        <td className="text-right bg-highlight balance">{row.closing}</td>
                        <td className="text-center">
                          <button className="view-detail-btn">
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="total-label">합계 (Totals):</td>
                      <td className="total-income">₩ 83,150,000</td>
                      <td className="total-expense">₩ 25,700,000</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="ledger-footer">
                <span className="ledger-footer__info">총 42개의 계정 과목 중 1-6 표시</span>
                <div className="pagination">
                  <button className="pagination__btn">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="pagination__btn active">1</button>
                  <button className="pagination__btn">2</button>
                  <button className="pagination__btn">3</button>
                  <button className="pagination__btn">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Finance;
