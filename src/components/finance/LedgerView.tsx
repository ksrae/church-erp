import { Transaction, AccountBreakdown, LedgerRow, DetailViewType } from "../../types/finance";
import DonutChart from "../charts/DonutChart";
import { useLocale } from "../../i18n/LocaleContext";

interface StatCardProps {
  type: "income" | "expense" | "net";
  label: string;
  value: string;
  isActive: boolean;
  netValue?: number;
  onClick: () => void;
}

function StatCard({ type, label, value, isActive, netValue, onClick }: StatCardProps) {
  const getDecorationClass = () => {
    if (type === "net") {
      return netValue && netValue >= 0 ? "stat-card__decoration--green" : "stat-card__decoration--red";
    }
    return type === "income" ? "stat-card__decoration--green" : "stat-card__decoration--red";
  };

  const getIconClass = () => {
    if (type === "net") {
      return netValue && netValue >= 0 ? "stat-card__icon--green" : "stat-card__icon--red";
    }
    return type === "income" ? "stat-card__icon--green" : "stat-card__icon--red";
  };

  const getIcon = () => {
    if (type === "income") return "trending_up";
    if (type === "expense") return "trending_down";
    return netValue && netValue >= 0 ? "savings" : "warning";
  };

  return (
    <div
      className={`stat-card stat-card--clickable stat-card--large ${isActive ? "stat-card--active" : ""}`}
      onClick={onClick}
    >
      <div className={`stat-card__decoration ${getDecorationClass()}`} />
      <div className="stat-card__header">
        <span className={`stat-card__icon ${getIconClass()}`}>
          <span className="material-symbols-outlined">{getIcon()}</span>
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      <div className="stat-card__value-wrapper">
        <span className={`stat-card__value ${type === "net" ? (netValue && netValue >= 0 ? "text-green-600" : "text-red-600") : ""}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface LedgerViewProps {
  ledgerData: LedgerRow[];
  monthlyTransactions: Transaction[];
  monthlyIncomeTransactions: Transaction[];
  monthlyExpenseTransactions: Transaction[];
  incomeByAccount: AccountBreakdown[];
  expenseByAccount: AccountBreakdown[];
  totals: { income: number; expense: number; net: number };
  yearlyTotals: { income: number; expense: number; net: number };
  selectedYear: number;
  selectedMonth: number;
  detailView: DetailViewType;
  formatCurrency: (amount: number, useLarge?: boolean) => string;
  setDetailView: (view: DetailViewType) => void;
  onAddAccount: () => void;
  onEditAccount: (account: LedgerRow) => void;
  onDeleteAccount: (accountId: string) => void;
}

function LedgerView({
  ledgerData,
  monthlyTransactions,
  monthlyIncomeTransactions,
  monthlyExpenseTransactions,
  incomeByAccount,
  expenseByAccount,
  totals,
  yearlyTotals,
  selectedYear,
  selectedMonth,
  detailView,
  formatCurrency,
  setDetailView,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: LedgerViewProps) {
  const { t, locale } = useLocale();
  const monthName = (month: number) =>
    locale === "ko" ? `${month}월` : new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });

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

  const renderOverviewContent = () => (
    <div className="overview-content overview-content--wide">
      {monthlyTransactions.length > 0 ? (
        <>
          <div className="monthly-summary-header monthly-summary-header--compact">
            <div className="monthly-summary-top">
              <div className="summary-item-compact income" onClick={() => setDetailView("income")}>
                <span className="label">{t("finance.ledger.income")}</span>
                <span className="value">{formatCurrency(totals.income, true)}</span>
              </div>
              <div className="vertical-divider"></div>
              <div className="summary-item-compact expense" onClick={() => setDetailView("expense")}>
                <span className="label">{t("finance.ledger.expense")}</span>
                <span className="value">{formatCurrency(totals.expense, true)}</span>
              </div>
            </div>

            <div className={`summary-item-highlight result ${totals.net >= 0 ? "positive" : "negative"}`}>
              <div className="net-profit-label">
                <span className="material-symbols-outlined">
                  {totals.net >= 0 ? "savings" : "trending_down"}
                </span>
                <span>{t("finance.ledger.netProfit")}</span>
              </div>
              <span className="net-profit-value">{formatCurrency(totals.net, true)}</span>
            </div>

            <div className="header-progress-bar">
              <div
                className={`progress-fill ${totals.income > 0 ? (totals.expense / totals.income >= 1 ? "danger" : totals.expense / totals.income >= 0.8 ? "warning" : "success") : ""}`}
                style={{ width: totals.income > 0 ? `${Math.min((totals.expense / totals.income) * 100, 100)}%` : "0%" }}
              ></div>
              <span className="progress-text">
                {t("finance.ledger.expenseRatio", { percent: totals.income > 0 ? ((totals.expense / totals.income) * 100).toFixed(0) : 0 })}
              </span>
            </div>
          </div>

          <div className="overview-charts overview-charts--expanded">
            <div className="mini-chart-section" onClick={() => setDetailView("income")}>
              <h4>{t("finance.ledger.incomeBreakdown")}</h4>
              <DonutChart
                data={incomeByAccount}
                size="medium"
                centerValue={incomeByAccount.length.toString()}
              />
              <div className="mini-legend">
                {incomeByAccount.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="legend-row">
                    <span className="dot" style={{ background: item.color }}></span>
                    <span className="name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-chart-section" onClick={() => setDetailView("expense")}>
              <h4>{t("finance.ledger.expenseBreakdown")}</h4>
              <DonutChart
                data={expenseByAccount}
                size="medium"
                centerValue={expenseByAccount.length.toString()}
              />
              <div className="mini-legend">
                {expenseByAccount.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="legend-row">
                    <span className="dot" style={{ background: item.color }}></span>
                    <span className="name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <p>{t("finance.ledger.noMonthData", { year: selectedYear, month: monthName(selectedMonth) })}</p>
          <p className="sub">{t("finance.ledger.noMonthDataHint")}</p>
        </div>
      )}
    </div>
  );

  const renderIncomeDetail = () => (
    <div className="detail-view-content">
      {incomeByAccount.length > 0 ? (
        <>
          <div className="detail-chart-section">
            <DonutChart
              data={incomeByAccount}
              size="large"
              centerValue={formatCurrency(totals.income)}
              centerLabel={t("finance.ledger.totalIncome")}
            />
            <div className="chart-legend">
              {incomeByAccount.map((item, idx) => (
                <div key={idx} className="legend-item-detailed">
                  <div className="legend-left">
                    <span className="dot" style={{ background: item.color }}></span>
                    <span className="name">{item.name}</span>
                  </div>
                  <div className="legend-right">
                    <span className="amount">{formatCurrency(item.amount)}</span>
                    <span className="percent">
                      {((item.amount / totals.income) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="detail-table">
            <h4>{t("finance.ledger.recentIncome")}</h4>
            <div className="detail-table-list">
              {monthlyIncomeTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="detail-table-row">
                  <div className="row-left">
                    <span className="date">{tx.date.slice(5)}</span>
                    <span className="desc">{tx.description}</span>
                  </div>
                  <span className="amount income">
                    +{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="material-symbols-outlined">trending_up</span>
          <p>{t("finance.ledger.noMonthIncome", { month: monthName(selectedMonth) })}</p>
        </div>
      )}
    </div>
  );

  const renderExpenseDetail = () => (
    <div className="detail-view-content">
      {expenseByAccount.length > 0 ? (
        <>
          <div className="detail-chart-section">
            <DonutChart
              data={expenseByAccount}
              size="large"
              centerValue={formatCurrency(totals.expense)}
              centerLabel={t("finance.ledger.totalExpense")}
            />
            <div className="chart-legend">
              {expenseByAccount.map((item, idx) => (
                <div key={idx} className="legend-item-detailed">
                  <div className="legend-left">
                    <span className="dot" style={{ background: item.color }}></span>
                    <span className="name">{item.name}</span>
                  </div>
                  <div className="legend-right">
                    <span className="amount">{formatCurrency(item.amount)}</span>
                    <span className="percent">
                      {((item.amount / totals.expense) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="detail-table">
            <h4>{t("finance.ledger.recentExpense")}</h4>
            <div className="detail-table-list">
              {monthlyExpenseTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="detail-table-row">
                  <div className="row-left">
                    <span className="date">{tx.date.slice(5)}</span>
                    <span className="desc">{tx.description}</span>
                  </div>
                  <span className="amount expense">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="material-symbols-outlined">trending_down</span>
          <p>{t("finance.ledger.noMonthExpense", { month: monthName(selectedMonth) })}</p>
        </div>
      )}
    </div>
  );

  const renderNetDetail = () => (
    <div className="net-profit-dashboard">
      <div className="net-profit-cards">
        <div className="profit-card income">
          <div className="profit-card__icon">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <span className="profit-card__label">{t("finance.ledger.totalIncome")}</span>
            <span className="profit-card__value">{formatCurrency(totals.income)}</span>
          </div>
        </div>
        <div className="profit-card expense">
          <div className="profit-card__icon">
            <span className="material-symbols-outlined">trending_down</span>
          </div>
          <div>
            <span className="profit-card__label">{t("finance.ledger.totalExpense")}</span>
            <span className="profit-card__value">{formatCurrency(totals.expense)}</span>
          </div>
        </div>
        <div className={`profit-card net ${totals.net >= 0 ? "positive" : "negative"}`}>
          <div className="profit-card__icon">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div>
            <span className="profit-card__label">{t("finance.ledger.net")}</span>
            <span className="profit-card__value">{formatCurrency(totals.net)}</span>
          </div>
        </div>
      </div>

      <div className="net-profit-details">
        <div className="top-list-section">
          <h4>{t("finance.ledger.topIncome")}</h4>
          <div className="top-list">
            {ledgerData
              .filter(d => d.type === 'income' && d.income > 0)
              .sort((a, b) => b.income - a.income)
              .slice(0, 3)
              .map(item => (
                <div className="top-item" key={item.id}>
                  <div className="top-item__name">
                    <span className="dot income" />
                    {item.name}
                  </div>
                  <span className="top-item__amount">{formatCurrency(item.income)}</span>
                </div>
              ))}
            {ledgerData.filter(d => d.type === 'income' && d.income > 0).length === 0 && (
              <div className="top-item empty">{t("finance.ledger.noData")}</div>
            )}
          </div>
        </div>

        <div className="top-list-section">
          <h4>{t("finance.ledger.topExpense")}</h4>
          <div className="top-list">
            {ledgerData
              .filter(d => d.type === 'expense' && d.expense > 0)
              .sort((a, b) => b.expense - a.expense)
              .slice(0, 3)
              .map(item => (
                <div className="top-item" key={item.id}>
                  <div className="top-item__name">
                    <span className="dot expense" />
                    {item.name}
                  </div>
                  <span className="top-item__amount">{formatCurrency(item.expense)}</span>
                </div>
              ))}
            {ledgerData.filter(d => d.type === 'expense' && d.expense > 0).length === 0 && (
              <div className="top-item empty">{t("finance.ledger.noData")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const getDetailContent = () => {
    switch (detailView) {
      case "overview":
        return renderOverviewContent();
      case "income":
        return renderIncomeDetail();
      case "expense":
        return renderExpenseDetail();
      case "net":
        return renderNetDetail();
      default:
        return renderOverviewContent();
    }
  };

  return (
    <>
      {/* Stats Grid - Two column layout */}
      <div className="finance-stats finance-stats--two-column">
        <div className="finance-stats__left">
          <StatCard
            type="income"
            label={t("finance.ledger.yearlyIncome", { year: selectedYear })}
            value={formatCurrency(yearlyTotals.income, true)}
            isActive={detailView === "income"}
            onClick={() => setDetailView(detailView === "income" ? "overview" : "income")}
          />
          <StatCard
            type="expense"
            label={t("finance.ledger.yearlyExpense", { year: selectedYear })}
            value={formatCurrency(yearlyTotals.expense, true)}
            isActive={detailView === "expense"}
            onClick={() => setDetailView(detailView === "expense" ? "overview" : "expense")}
          />
          <StatCard
            type="net"
            label={t("finance.ledger.yearlyNet", { year: selectedYear })}
            value={formatCurrency(yearlyTotals.net, true)}
            isActive={detailView === "net"}
            netValue={yearlyTotals.net}
            onClick={() => setDetailView(detailView === "net" ? "overview" : "net")}
          />
        </div>

        <div className="finance-stats__right">
          <div className="finance-chart-card">
            <div className="finance-chart-card__header">
              <div>
                <h3 className="finance-chart-card__title">
                  {detailView === "overview" && t("finance.ledger.monthlyStatusTitle", { year: selectedYear, month: monthName(selectedMonth) })}
                  {detailView === "income" && t("finance.ledger.incomeAnalysis")}
                  {detailView === "expense" && t("finance.ledger.expenseAnalysis")}
                  {detailView === "net" && t("finance.ledger.netAnalysis")}
                </h3>
                <p className="finance-chart-card__subtitle">
                  {detailView === "overview" && t("finance.ledger.totalTransactions", { n: monthlyTransactions.length })}
                  {detailView === "income" && t("finance.ledger.incomeCount", { n: monthlyIncomeTransactions.length })}
                  {detailView === "expense" && t("finance.ledger.expenseCount", { n: monthlyExpenseTransactions.length })}
                  {detailView === "net" && t("finance.ledger.netSubtitle")}
                </p>
              </div>
              {detailView !== "overview" && (
                <button
                  className="back-to-overview-btn"
                  onClick={() => setDetailView("overview")}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  {t("finance.ledger.backToOverview")}
                </button>
              )}
            </div>

            {getDetailContent()}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <section className="ledger-section">
        <div className="ledger-header">
          <div>
            <h2 className="ledger-header__title">{t("finance.ledger.ledgerTitle")}</h2>
            <p className="ledger-header__subtitle">
              {t("finance.ledger.ledgerSubtitle")}
            </p>
          </div>
          <div className="ledger-header__controls">
            <button className="ledger-export-btn" onClick={onAddAccount}>
              <span className="material-symbols-outlined">add</span>
              {t("finance.ledger.addAccount")}
            </button>
          </div>
        </div>

        <div className="ledger-table-wrapper">
          {ledgerData.length > 0 ? (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "12.5rem" }}>{t("finance.ledger.colAccount")}</th>
                  <th className="text-right bg-highlight">{t("finance.ledger.colOpening")}</th>
                  <th className="text-right text-income">{t("finance.ledger.colIncome")}</th>
                  <th className="text-right text-expense">{t("finance.ledger.colExpense")}</th>
                  <th className="text-right bg-highlight">{t("finance.ledger.colBalance")}</th>
                  <th className="text-center" style={{ width: "8rem" }}>{t("finance.ledger.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="account-cell">
                        <div className="account-cell__name">
                          <div className={`account-cell__dot ${getDotClass(row.type)}`} />
                          <span className="account-cell__title">{row.name}</span>
                        </div>
                        {row.subName && (
                          <span className="account-cell__sub">({row.subName})</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right bg-highlight">{formatCurrency(row.opening)}</td>
                    <td className="text-right income">{formatCurrency(row.income)}</td>
                    <td className="text-right expense">{formatCurrency(row.expense)}</td>
                    <td className="text-right bg-highlight balance">
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="text-center">
                      <div className="action-buttons">
                        <button
                          className="view-detail-btn"
                          onClick={() => onEditAccount(row)}
                          title={t("finance.table.edit")}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          className="view-detail-btn delete"
                          onClick={() => onDeleteAccount(row.id)}
                          title={t("finance.table.delete")}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="total-label">{t("finance.ledger.totals")}</td>
                  <td className="total-income">{formatCurrency(totals.income)}</td>
                  <td className="total-expense">{formatCurrency(totals.expense)}</td>
                  <td className="total-net">{formatCurrency(totals.net)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="empty-state">
              <span className="material-symbols-outlined">receipt_long</span>
              <p>{t("finance.ledger.emptyAccounts")}</p>
              <p className="sub">{t("finance.ledger.emptyAccountsHint")}</p>
            </div>
          )}
        </div>

        <div className="ledger-footer">
          <span className="ledger-footer__info">{t("finance.ledger.accountCount", { n: ledgerData.length })}</span>
        </div>
      </section>
    </>
  );
}

export default LedgerView;
