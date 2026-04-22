import { ReportData } from "../../types/finance";
import { useLocale } from "../../i18n/LocaleContext";

interface ReportViewProps {
  reportData: ReportData;
  reportType: "monthly" | "yearly";
  reportYear: number;
  reportMonth: number;
  formatCurrency: (amount: number) => string;
  onReportTypeChange: (type: "monthly" | "yearly") => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

function ReportView({
  reportData,
  reportType,
  reportYear,
  reportMonth,
  formatCurrency,
  onReportTypeChange,
  onYearChange,
  onMonthChange,
}: ReportViewProps) {
  const { t, locale } = useLocale();

  const handleExportCSV = async () => {
    try {
      let csv = "\uFEFF";

      let churchName = "";
      try {
        const stored = localStorage.getItem("church_erp_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.church?.churchName) {
            churchName = parsed.church.churchName;
          }
        }
      } catch (e) { }

      if (churchName) {
        csv += `[${churchName}]\n`;
      }
      csv += t("finance.report.csvHeader") + "\n";

      let hasData = false;

      if (reportData && reportData.groupedTransactions) {
        if (reportData.groupedTransactions.income) {
          Object.entries(reportData.groupedTransactions.income).forEach(([accName, txns]) => {
            if (Array.isArray(txns)) {
              txns.forEach(tx => {
                const safeDesc = (tx.description || "").replace(/"/g, '""');
                const safeMemo = (tx.memo || "").replace(/"/g, '""');
                csv += `"${tx.date}",${t("finance.report.csvIncome")},"${accName}","${safeDesc}",${tx.amount},"${safeMemo}"\n`;
                hasData = true;
              });
            }
          });
        }
        if (reportData.groupedTransactions.expense) {
          Object.entries(reportData.groupedTransactions.expense).forEach(([accName, txns]) => {
            if (Array.isArray(txns)) {
              txns.forEach(tx => {
                const safeDesc = (tx.description || "").replace(/"/g, '""');
                const safeMemo = (tx.memo || "").replace(/"/g, '""');
                csv += `"${tx.date}",${t("finance.report.csvExpense")},"${accName}","${safeDesc}",${tx.amount},"${safeMemo}"\n`;
                hasData = true;
              });
            }
          });
        }
      }

      if (!hasData) {
        alert(t("finance.alert.exportEmpty"));
        return;
      }

      csv += `\n${t("finance.report.csvSummary")}\n`;
      csv += `${t("finance.report.csvTotalIncome")},,${reportData.totalIncome}\n`;
      csv += `${t("finance.report.csvTotalExpense")},,${reportData.totalExpense}\n`;
      csv += `${t("finance.report.csvNet")},,${reportData.netIncome}\n`;
      csv += `${t("finance.report.csvCount")},,${reportData.transactionCount}\n`;

      const fileName = reportType === "monthly"
        ? t("finance.report.fileNameMonthly", { year: reportYear, month: reportMonth })
        : t("finance.report.fileNameYearly", { year: reportYear });
      downloadBrowser(csv, fileName);
    } catch (e) {
      console.error("CSV Export Error:", e);
      alert(t("finance.alert.exportError"));
    }
  };

  const downloadBrowser = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handlePrint = () => {
    window.print();
  };

  const yearLabel = (year: number) => locale === "ko" ? `${year}년` : `${year}`;
  const monthLabel = (month: number) => locale === "ko"
    ? `${month}월`
    : new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });

  return (
    <>
      <div className="report-header report-header--column">
        <div className="report-header__row top">
          <div className="report-header__info">
            <h2>{t("finance.report.title")}</h2>
            <p>{t("finance.report.subtitle")}</p>
          </div>
          <div className="report-actions">
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExportCSV();
              }}
              style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">download</span>
              {t("finance.report.export")}
            </button>
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrint();
              }}
              style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">print</span>
              {t("finance.report.print")}
            </button>
          </div>
        </div>

        <div className="report-header__row bottom">
          <div className="report-controls-group">
            <div className="report-type-toggle">
              <button
                className={reportType === "monthly" ? "active" : ""}
                onClick={() => onReportTypeChange("monthly")}
              >
                {t("finance.report.monthly")}
              </button>
              <button
                className={reportType === "yearly" ? "active" : ""}
                onClick={() => onReportTypeChange("yearly")}
              >
                {t("finance.report.yearly")}
              </button>
            </div>
            <div className="report-period-selector">
              <select
                value={reportYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{yearLabel(year)}</option>
                ))}
              </select>
              {reportType === "monthly" && (
                <select
                  value={reportMonth}
                  onChange={(e) => onMonthChange(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{monthLabel(month)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="report-summary-cards">
        <div className="report-card income">
          <div className="report-card__icon">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div className="report-card__content">
            <span className="label">{t("finance.report.totalIncome")}</span>
            <span className="value">{formatCurrency(reportData.totalIncome)}</span>
          </div>
        </div>
        <div className="report-card expense">
          <div className="report-card__icon">
            <span className="material-symbols-outlined">trending_down</span>
          </div>
          <div className="report-card__content">
            <span className="label">{t("finance.report.totalExpense")}</span>
            <span className="value">{formatCurrency(reportData.totalExpense)}</span>
          </div>
        </div>
        <div className={`report-card net ${reportData.netIncome >= 0 ? "positive" : "negative"}`}>
          <div className="report-card__icon">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div className="report-card__content">
            <span className="label">{t("finance.report.netIncome")}</span>
            <span className="value">{formatCurrency(reportData.netIncome)}</span>
          </div>
        </div>
        <div className="report-card count">
          <div className="report-card__icon">
            <span className="material-symbols-outlined">receipt</span>
          </div>
          <div className="report-card__content">
            <span className="label">{t("finance.report.txnCount")}</span>
            <span className="value">{t("finance.summary.count", { n: reportData.transactionCount })}</span>
          </div>
        </div>
      </div>

      <div className="report-breakdown">
        <div className="breakdown-section income">
          <h3>
            <span className="material-symbols-outlined">trending_up</span>
            {t("finance.report.incomeDetail")}
          </h3>
          {Object.keys(reportData.incomeByAccount).length > 0 ? (
            <div className="breakdown-list">
              {Object.entries(reportData.incomeByAccount)
                .sort((a, b) => b[1] - a[1])
                .map(([account, amount]) => (
                  <div key={account} className="breakdown-item">
                    <span className="name">{account}</span>
                    <span className="amount">{formatCurrency(amount)}</span>
                    <div className="bar-wrapper">
                      <div
                        className="bar"
                        style={{
                          width: `${(amount / reportData.totalIncome) * 100}%`
                        }}
                      />
                    </div>
                    <span className="percent">
                      {((amount / reportData.totalIncome) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty-breakdown">{t("finance.report.emptyIncome")}</div>
          )}
        </div>

        <div className="breakdown-section expense">
          <h3>
            <span className="material-symbols-outlined">trending_down</span>
            {t("finance.report.expenseDetail")}
          </h3>
          {Object.keys(reportData.expenseByAccount).length > 0 ? (
            <div className="breakdown-list">
              {Object.entries(reportData.expenseByAccount)
                .sort((a, b) => b[1] - a[1])
                .map(([account, amount]) => (
                  <div key={account} className="breakdown-item">
                    <span className="name">{account}</span>
                    <span className="amount">{formatCurrency(amount)}</span>
                    <div className="bar-wrapper">
                      <div
                        className="bar"
                        style={{
                          width: `${(amount / reportData.totalExpense) * 100}%`
                        }}
                      />
                    </div>
                    <span className="percent">
                      {((amount / reportData.totalExpense) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty-breakdown">{t("finance.report.emptyExpense")}</div>
          )}
        </div>
      </div>

      <div className="report-table-section">
        <h3>{t("finance.report.detailData")}</h3>
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>{t("finance.report.colDate")}</th>
                <th>{t("finance.report.colDescription")}</th>
                <th className="text-right" style={{ width: '150px' }}>{t("finance.report.colAmount")}</th>
                <th style={{ width: '200px' }}>{t("finance.report.colMemo")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group-header income">
                <td colSpan={4} style={{ background: '#eff6ff', color: '#1e40af', fontWeight: 'bold' }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em', marginRight: '0.5rem' }}>trending_up</span>
                  {t("finance.report.incomeDetail")}
                </td>
              </tr>
              {Object.entries(reportData.groupedTransactions.income).length > 0 ? (
                Object.entries(reportData.groupedTransactions.income).map(([accName, txns]) => (
                  <>
                    <tr key={`inc-header-${accName}`} className="sub-group-header">
                      <td colSpan={4} style={{ background: '#f8fafc', fontWeight: 'bold', paddingLeft: '2rem' }}>
                        {accName}
                      </td>
                    </tr>
                    {txns.map(tx => (
                      <tr key={tx.id}>
                        <td style={{ paddingLeft: '2rem', whiteSpace: 'nowrap' }}>{tx.date.slice(2).replace(/-/g, '.')}</td>
                        <td>{tx.description}</td>
                        <td className="text-right">{formatCurrency(tx.amount)}</td>
                        <td className="text-secondary">{tx.memo || '-'}</td>
                      </tr>
                    ))}
                    <tr key={`inc-subtotal-${accName}`} className="sub-total-row">
                      <td colSpan={2} className="text-right text-secondary" style={{ paddingRight: '1rem' }}>{t("finance.report.subtotal")}</td>
                      <td className="text-right" style={{ fontWeight: 'bold' }}>
                        {formatCurrency(txns.reduce((s, tx) => s + tx.amount, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center text-secondary">{t("finance.report.emptyIncome")}</td></tr>
              )}

              <tr className="group-header expense">
                <td colSpan={4} style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 'bold' }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em', marginRight: '0.5rem' }}>trending_down</span>
                  {t("finance.report.expenseDetail")}
                </td>
              </tr>
              {Object.entries(reportData.groupedTransactions.expense).length > 0 ? (
                Object.entries(reportData.groupedTransactions.expense).map(([accName, txns]) => (
                  <>
                    <tr key={`exp-header-${accName}`} className="sub-group-header">
                      <td colSpan={4} style={{ background: '#f8fafc', fontWeight: 'bold', paddingLeft: '2rem' }}>
                        {accName}
                      </td>
                    </tr>
                    {txns.map(tx => (
                      <tr key={tx.id}>
                        <td style={{ paddingLeft: '2rem', whiteSpace: 'nowrap' }}>{tx.date.slice(2).replace(/-/g, '.')}</td>
                        <td>{tx.description}</td>
                        <td className="text-right">{formatCurrency(tx.amount)}</td>
                        <td className="text-secondary">{tx.memo || '-'}</td>
                      </tr>
                    ))}
                    <tr key={`exp-subtotal-${accName}`} className="sub-total-row">
                      <td colSpan={2} className="text-right text-secondary" style={{ paddingRight: '1rem' }}>{t("finance.report.subtotal")}</td>
                      <td className="text-right" style={{ fontWeight: 'bold' }}>
                        {formatCurrency(txns.reduce((s, tx) => s + tx.amount, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center text-secondary">{t("finance.report.emptyExpense")}</td></tr>
              )}

              <tr className="total-row" style={{ borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={2} style={{ fontSize: '1.1em' }}>{t("finance.report.netSummary")}</td>
                <td className="text-right" style={{ color: reportData.netIncome >= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 'bold', fontSize: '1.1em' }}>
                  {formatCurrency(reportData.netIncome)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ReportView;
