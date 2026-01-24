import { useState, useEffect } from "react";

const FINANCE_STORAGE_KEY = "church_erp_finance";

interface LedgerItem {
  id: string;
  code: string;
  name: string;
  subName: string;
  type: "asset" | "income" | "expense";
  opening: number;
  income: number;
  expense: number;
}

interface FinanceData {
  ledger: LedgerItem[];
  lastUpdated: string;
}

function Finance() {
  const [financeData, setFinanceData] = useState<FinanceData>({
    ledger: [],
    lastUpdated: "",
  });

  // 저장된 재정 데이터 로드
  useEffect(() => {
    const savedFinance = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (savedFinance) {
      try {
        const parsed = JSON.parse(savedFinance);
        setFinanceData(parsed);
      } catch {
        // 파싱 에러
      }
    }
  }, []);

  // 금액 포맷팅
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return "0";
    return amount.toLocaleString("ko-KR");
  };

  // 합계 계산
  const totals = financeData.ledger.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
    }),
    { income: 0, expense: 0 }
  );

  // 닷 컬러 결정
  const getDotClass = (type: string): string => {
    switch (type) {
      case "asset":
        return "account-cell__dot--blue";
      case "income":
        return "account-cell__dot--green";
      case "expense":
        return "account-cell__dot--rose";
      default:
        return "account-cell__dot--blue";
    }
  };

  // 현재 월 가져오기
  const currentMonth = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="finance-page">
      {/* Sidebar - 간소화 */}
      <aside className="finance-sidebar">
        <div className="finance-sidebar__header">
          <div className="finance-sidebar__logo" />
          <div>
            <h1 className="finance-sidebar__title">회계 관리</h1>
            <p className="finance-sidebar__subtitle">재정 시스템</p>
          </div>
        </div>

        <nav className="finance-nav">
          <a className="finance-nav__item active" href="#">
            <span className="material-symbols-outlined filled">
              account_balance_wallet
            </span>
            <span>총계정원장</span>
          </a>
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">trending_up</span>
            <span>수입 관리</span>
          </a>
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">trending_down</span>
            <span>지출 관리</span>
          </a>
          <a className="finance-nav__item" href="#">
            <span className="material-symbols-outlined">assessment</span>
            <span>보고서</span>
          </a>
        </nav>

        <div className="finance-sidebar__user">
          <div
            className="finance-sidebar__user-avatar"
            style={{
              background: "#4b5563",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "white", fontSize: "1.25rem" }}
            >
              person
            </span>
          </div>
          <div>
            <p className="finance-sidebar__user-name">재정부</p>
            <p className="finance-sidebar__user-role">관리자</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="finance-content">
        <header className="finance-header">
          <h2 className="finance-header__title">총계정원장 및 재무 보고서</h2>
          <div className="finance-header__actions">
            <span className="finance-header__badge">{currentMonth} 결산</span>
          </div>
        </header>

        <div className="finance-main">
          <div className="finance-main__inner">
            {/* Stats Grid */}
            <div className="finance-stats">
              {/* Left Stats */}
              <div className="finance-stats__left">
                <div className="stat-card">
                  <div className="stat-card__decoration stat-card__decoration--green" />
                  <div className="stat-card__header">
                    <span className="stat-card__icon stat-card__icon--green">
                      <span className="material-symbols-outlined">
                        trending_up
                      </span>
                    </span>
                    <span className="stat-card__label">총 수입</span>
                  </div>
                  <div className="stat-card__value-wrapper">
                    <span className="stat-card__value">
                      ₩ {formatCurrency(totals.income)}
                    </span>
                  </div>
                  <p className="stat-card__note">
                    {financeData.ledger.filter((l) => l.type === "income").length}개
                    항목
                  </p>
                </div>

                <div className="stat-card">
                  <div className="stat-card__decoration stat-card__decoration--blue" />
                  <div className="stat-card__header">
                    <span className="stat-card__icon stat-card__icon--blue">
                      <span className="material-symbols-outlined">
                        trending_down
                      </span>
                    </span>
                    <span className="stat-card__label">총 지출</span>
                  </div>
                  <div className="stat-card__value-wrapper">
                    <span className="stat-card__value">
                      ₩ {formatCurrency(totals.expense)}
                    </span>
                  </div>
                  <p className="stat-card__note">
                    {financeData.ledger.filter((l) => l.type === "expense").length}개
                    항목
                  </p>
                </div>

                <div className="budget-card">
                  <div className="budget-card__decoration">
                    <span className="material-symbols-outlined">
                      account_balance
                    </span>
                  </div>
                  <span className="budget-card__label">순이익</span>
                  <span className="budget-card__value">
                    ₩ {formatCurrency(totals.income - totals.expense)}
                  </span>
                  <span className="budget-card__note">수입 - 지출</span>
                </div>
              </div>

              {/* Right - Empty State or Chart */}
              <div className="finance-stats__right">
                <div className="finance-chart-card">
                  <div className="finance-chart-card__header">
                    <div>
                      <h3 className="finance-chart-card__title">
                        재정 현황
                      </h3>
                      <p className="finance-chart-card__subtitle">
                        {financeData.lastUpdated
                          ? `마지막 업데이트: ${financeData.lastUpdated}`
                          : "데이터가 없습니다."}
                      </p>
                    </div>
                  </div>
                  {financeData.ledger.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "3rem",
                          marginBottom: "1rem",
                          display: "block",
                        }}
                      >
                        account_balance_wallet
                      </span>
                      <p>등록된 재정 데이터가 없습니다.</p>
                      <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                        아래에서 새 계정을 추가해주세요.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <section className="ledger-section">
              <div className="ledger-header">
                <div>
                  <h2 className="ledger-header__title">
                    총계정원장 (General Ledger)
                  </h2>
                  <p className="ledger-header__subtitle">
                    지정된 기간 동안의 모든 계정 잔액 및 상세 내역을 조회합니다.
                  </p>
                </div>
                <div className="ledger-header__controls">
                  <button className="ledger-export-btn">
                    <span className="material-symbols-outlined">add</span>
                    새 계정 추가
                  </button>
                </div>
              </div>

              <div className="ledger-table-wrapper">
                {financeData.ledger.length > 0 ? (
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th style={{ width: "6rem" }}>계정코드</th>
                        <th style={{ minWidth: "12.5rem" }}>
                          계정명 (Account Name)
                        </th>
                        <th className="text-right bg-highlight">기초잔액</th>
                        <th className="text-right text-income">수입(차변)</th>
                        <th className="text-right text-expense">지출(대변)</th>
                        <th className="text-right bg-highlight">기말잔액</th>
                        <th className="text-center" style={{ width: "6rem" }}>
                          상세보기
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData.ledger.map((row) => (
                        <tr key={row.id}>
                          <td className="code">{row.code}</td>
                          <td>
                            <div className="account-cell">
                              <div className="account-cell__name">
                                <div
                                  className={`account-cell__dot ${getDotClass(
                                    row.type
                                  )}`}
                                />
                                <span className="account-cell__title">
                                  {row.name}
                                </span>
                              </div>
                              {row.subName && (
                                <span className="account-cell__sub">
                                  {row.subName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right bg-highlight">
                            {formatCurrency(row.opening)}
                          </td>
                          <td className="text-right income">
                            {formatCurrency(row.income)}
                          </td>
                          <td className="text-right expense">
                            {formatCurrency(row.expense)}
                          </td>
                          <td className="text-right bg-highlight balance">
                            {formatCurrency(
                              row.opening + row.income - row.expense
                            )}
                          </td>
                          <td className="text-center">
                            <button className="view-detail-btn">
                              <span className="material-symbols-outlined">
                                visibility
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="total-label">
                          합계 (Totals):
                        </td>
                        <td className="total-income">
                          ₩ {formatCurrency(totals.income)}
                        </td>
                        <td className="total-expense">
                          ₩ {formatCurrency(totals.expense)}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "3rem",
                        marginBottom: "1rem",
                        display: "block",
                      }}
                    >
                      receipt_long
                    </span>
                    <p>등록된 계정이 없습니다.</p>
                    <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                      "새 계정 추가" 버튼을 클릭하여 계정을 등록해주세요.
                    </p>
                  </div>
                )}
              </div>

              <div className="ledger-footer">
                <span className="ledger-footer__info">
                  총 {financeData.ledger.length}개의 계정
                </span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Finance;
