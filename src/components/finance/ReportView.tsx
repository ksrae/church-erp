import { ReportData } from "../../types/finance";
import { save } from "@tauri-apps/api/dialog";
import { writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";

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

  const handleExportCSV = async () => {
    try {
      // CSV Header with BOM for Korean support
      let csv = "\uFEFF";
      csv += "날짜,구분,계정명,적요,금액,메모\n";

      let hasData = false;

      if (reportData && reportData.groupedTransactions) {
        if (reportData.groupedTransactions.income) {
          Object.entries(reportData.groupedTransactions.income).forEach(([accName, txns]) => {
            if (Array.isArray(txns)) {
              txns.forEach(t => {
                const safeDesc = (t.description || "").replace(/"/g, '""');
                const safeMemo = (t.memo || "").replace(/"/g, '""');
                csv += `"${t.date}",수입,"${accName}","${safeDesc}",${t.amount},"${safeMemo}"\n`;
                hasData = true;
              });
            }
          });
        }
        if (reportData.groupedTransactions.expense) {
          Object.entries(reportData.groupedTransactions.expense).forEach(([accName, txns]) => {
            if (Array.isArray(txns)) {
              txns.forEach(t => {
                const safeDesc = (t.description || "").replace(/"/g, '""');
                const safeMemo = (t.memo || "").replace(/"/g, '""');
                csv += `"${t.date}",지출,"${accName}","${safeDesc}",${t.amount},"${safeMemo}"\n`;
                hasData = true;
              });
            }
          });
        }
      }

      if (!hasData) {
        alert("내보낼 데이터가 없습니다.");
        return;
      }

      csv += `\n[요약]\n`;
      csv += `총 수입,,${reportData.totalIncome}\n`;
      csv += `총 지출,,${reportData.totalExpense}\n`;
      csv += `순이익,,${reportData.netIncome}\n`;
      csv += `거래 건수,,${reportData.transactionCount}\n`;

      const fileName = `재정보고서_${reportYear}년${reportType === "monthly" ? "_" + reportMonth + "월" : ""}.csv`;

      // @ts-ignore
      const isTauri = window.__TAURI__ !== undefined;

      if (isTauri) {
        try {
          const filePath = await save({
            filters: [{ name: 'CSV', extensions: ['csv'] }],
            defaultPath: fileName
          });

          if (filePath) {
            await writeTextFile(filePath, csv);
            alert("파일이 성공적으로 저장되었습니다.");
          }
        } catch (err) {
          console.error("Tauri save failed, falling back to browser download:", err);
          downloadBrowser(csv, fileName);
        }
      } else {
        downloadBrowser(csv, fileName);
      }
    } catch (e) {
      console.error("CSV Export Error:", e);
      alert("데이터 내보내기 중 오류가 발생했습니다.");
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

  const handlePrint = async () => {
    // @ts-ignore
    const isTauri = window.__TAURI__ !== undefined;

    if (!isTauri) {
      window.print();
      return;
    }

    try {
      const htmlContent = generatePrintHTML();
      const filename = `print_report_${Date.now()}.html`;

      // Save temp html file in AppData
      await writeTextFile(filename, htmlContent, { dir: BaseDirectory.AppData });

      const appData = await appDataDir();
      const filePath = await join(appData, filename);

      // Use imported invoke to call custom Rust command
      await invoke('print_file', { path: filePath });

    } catch (e) {
      console.error("Print Error:", e);
      alert(`인쇄 기능을 실행하는 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}`);
      // Fallback
      window.print();
    }
  };

  const generatePrintHTML = () => {
    const period = `${reportYear}년 ${reportType === 'monthly' ? reportMonth + '월' : ''}`;

    let rows = '';

    // Income
    if (reportData.groupedTransactions.income) {
      rows += `<tr class="group-header income"><td colspan="5">수입 상세</td></tr>`;
      Object.entries(reportData.groupedTransactions.income).forEach(([accName, txns]) => {
        rows += `<tr class="sub-group-header"><td colspan="5">${accName}</td></tr>`;
        txns.forEach(t => {
          rows += `
             <tr>
               <td>${t.date}</td>
               <td>${accName}</td>
               <td>${t.description}</td>
               <td class="text-right">${formatCurrency(t.amount)}</td>
               <td>${t.memo || ''}</td>
             </tr>
           `;
        });
        const subTotal = txns.reduce((s, t) => s + t.amount, 0);
        rows += `<tr class="sub-total-row"><td colspan="3" class="text-right">소계</td><td class="text-right">${formatCurrency(subTotal)}</td><td></td></tr>`;
      });
    }

    // Expense
    if (reportData.groupedTransactions.expense) {
      rows += `<tr class="group-header expense"><td colspan="5">지출 상세</td></tr>`;
      Object.entries(reportData.groupedTransactions.expense).forEach(([accName, txns]) => {
        rows += `<tr class="sub-group-header"><td colspan="5">${accName}</td></tr>`;
        txns.forEach(t => {
          rows += `
             <tr>
               <td>${t.date}</td>
               <td>${accName}</td>
               <td>${t.description}</td>
               <td class="text-right">${formatCurrency(t.amount)}</td>
               <td>${t.memo || ''}</td>
             </tr>
           `;
        });
        const subTotal = txns.reduce((s, t) => s + t.amount, 0);
        rows += `<tr class="sub-total-row"><td colspan="3" class="text-right">소계</td><td class="text-right">${formatCurrency(subTotal)}</td><td></td></tr>`;
      });
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>재정 보고서 - ${period}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; }
            .meta { text-align: center; margin-bottom: 30px; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-right { text-align: right; }
            .group-header td { background-color: #f1f5f9; font-weight: bold; font-size: 14px; padding: 10px; }
            .group-header.income td { color: #16649c; background-color: #eff6ff; }
            .group-header.expense td { color: #ef4444; background-color: #fef2f2; }
            .sub-group-header td { background-color: #f8fafc; font-weight: bold; padding-left: 20px; }
            .sub-total-row td { background-color: #fafbfc; font-weight: bold; }
            .summary-table { width: 60%; margin: 0 auto 40px; }
            .summary-table th { width: 40%; }
            .net-income { color: ${reportData.netIncome >= 0 ? '#16649c' : '#ef4444'}; font-size: 1.1em; }
          </style>
        </head>
        <body>
          <h1>재정 보고서</h1>
          <div class="meta">${period}</div>

          <table class="summary-table">
            <tr>
              <th>총 수입</th>
              <td class="text-right">${formatCurrency(reportData.totalIncome)}</td>
            </tr>
            <tr>
              <th>총 지출</th>
              <td class="text-right">${formatCurrency(reportData.totalExpense)}</td>
            </tr>
            <tr>
              <th>순이익</th>
              <td class="text-right net-income">${formatCurrency(reportData.netIncome)}</td>
            </tr>
            <tr>
              <th>거래 건수</th>
              <td class="text-right">${reportData.transactionCount}건</td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th style="width: 100px;">날짜</th>
                <th style="width: 120px;">계정</th>
                <th>적요</th>
                <th style="width: 100px;" class="text-right">금액</th>
                <th style="width: 150px;">메모</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <>
      <div className="report-header report-header--column">
        <div className="report-header__row top">
          <div className="report-header__info">
            <h2>재정 보고서</h2>
            <p>월별 또는 연간 재정 현황을 확인합니다.</p>
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
              내보내기
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
              인쇄
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
                월별
              </button>
              <button
                className={reportType === "yearly" ? "active" : ""}
                onClick={() => onReportTypeChange("yearly")}
              >
                연간
              </button>
            </div>
            <div className="report-period-selector">
              <select
                value={reportYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
              {reportType === "monthly" && (
                <select
                  value={reportMonth}
                  onChange={(e) => onMonthChange(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{month}월</option>
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
            <span className="label">총 수입</span>
            <span className="value">{formatCurrency(reportData.totalIncome)}</span>
          </div>
        </div>
        <div className="report-card expense">
          <div className="report-card__icon">
            <span className="material-symbols-outlined">trending_down</span>
          </div>
          <div className="report-card__content">
            <span className="label">총 지출</span>
            <span className="value">{formatCurrency(reportData.totalExpense)}</span>
          </div>
        </div>
        <div className={`report-card net ${reportData.netIncome >= 0 ? "positive" : "negative"}`}>
          <div className="report-card__icon">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div className="report-card__content">
            <span className="label">순이익</span>
            <span className="value">{formatCurrency(reportData.netIncome)}</span>
          </div>
        </div>
        <div className="report-card count">
          <div className="report-card__icon">
            <span className="material-symbols-outlined">receipt</span>
          </div>
          <div className="report-card__content">
            <span className="label">거래 수</span>
            <span className="value">{reportData.transactionCount}건</span>
          </div>
        </div>
      </div>

      <div className="report-breakdown">
        <div className="breakdown-section income">
          <h3>
            <span className="material-symbols-outlined">trending_up</span>
            수입 상세
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
            <div className="empty-breakdown">수입 내역이 없습니다.</div>
          )}
        </div>

        <div className="breakdown-section expense">
          <h3>
            <span className="material-symbols-outlined">trending_down</span>
            지출 상세
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
            <div className="empty-breakdown">지출 내역이 없습니다.</div>
          )}
        </div>
      </div>

      <div className="report-table-section">
        <h3>상세 데이터</h3>
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>날짜</th>
                <th>적요</th>
                <th className="text-right" style={{ width: '150px' }}>금액</th>
                <th style={{ width: '200px' }}>메모</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group-header income">
                <td colSpan={4} style={{ background: '#eff6ff', color: '#1e40af', fontWeight: 'bold' }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em', marginRight: '0.5rem' }}>trending_up</span>
                  수입 상세
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
                    {txns.map(t => (
                      <tr key={t.id}>
                        <td style={{ paddingLeft: '2rem', whiteSpace: 'nowrap' }}>{t.date.slice(2).replace(/-/g, '.')}</td>
                        <td>{t.description}</td>
                        <td className="text-right">{formatCurrency(t.amount)}</td>
                        <td className="text-secondary">{t.memo || '-'}</td>
                      </tr>
                    ))}
                    <tr key={`inc-subtotal-${accName}`} className="sub-total-row">
                      <td colSpan={2} className="text-right text-secondary" style={{ paddingRight: '1rem' }}>소계</td>
                      <td className="text-right" style={{ fontWeight: 'bold' }}>
                        {formatCurrency(txns.reduce((s, t) => s + t.amount, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center text-secondary">수입 내역이 없습니다.</td></tr>
              )}

              <tr className="group-header expense">
                <td colSpan={4} style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 'bold' }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em', marginRight: '0.5rem' }}>trending_down</span>
                  지출 상세
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
                    {txns.map(t => (
                      <tr key={t.id}>
                        <td style={{ paddingLeft: '2rem', whiteSpace: 'nowrap' }}>{t.date.slice(2).replace(/-/g, '.')}</td>
                        <td>{t.description}</td>
                        <td className="text-right">{formatCurrency(t.amount)}</td>
                        <td className="text-secondary">{t.memo || '-'}</td>
                      </tr>
                    ))}
                    <tr key={`exp-subtotal-${accName}`} className="sub-total-row">
                      <td colSpan={2} className="text-right text-secondary" style={{ paddingRight: '1rem' }}>소계</td>
                      <td className="text-right" style={{ fontWeight: 'bold' }}>
                        {formatCurrency(txns.reduce((s, t) => s + t.amount, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center text-secondary">지출 내역이 없습니다.</td></tr>
              )}

              <tr className="total-row" style={{ borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={2} style={{ fontSize: '1.1em' }}>순이익 (수입 - 지출)</td>
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
