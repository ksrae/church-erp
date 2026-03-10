import { TabType } from "../../types/finance";

interface FinanceSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function FinanceSidebar({ activeTab, onTabChange }: FinanceSidebarProps) {
  return (
    <aside className="finance-sidebar">
      <div className="finance-sidebar__header">
        <div className="finance-sidebar__logo" />
        <div>
          <h1 className="finance-sidebar__title">회계 관리</h1>
          <p className="finance-sidebar__subtitle">재정 시스템</p>
        </div>
      </div>

      <nav className="finance-nav">
        <a
          className={`finance-nav__item ${activeTab === "ledger" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("ledger"); }}
        >
          <span className="material-symbols-outlined filled">account_balance_wallet</span>
          <span>총계정원장</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "income" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("income"); }}
        >
          <span className="material-symbols-outlined">trending_up</span>
          <span>수입 관리</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "expense" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("expense"); }}
        >
          <span className="material-symbols-outlined">trending_down</span>
          <span>지출 관리</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "report" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("report"); }}
        >
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
  );
}

export default FinanceSidebar;
