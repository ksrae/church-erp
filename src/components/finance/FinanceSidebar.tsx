import { TabType } from "../../types/finance";
import { useLocale } from "../../i18n/LocaleContext";

interface FinanceSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function FinanceSidebar({ activeTab, onTabChange }: FinanceSidebarProps) {
  const { t } = useLocale();
  return (
    <aside className="finance-sidebar">
      <div className="finance-sidebar__header">
        <div className="finance-sidebar__logo" />
        <div>
          <h1 className="finance-sidebar__title">{t("finance.sidebar.title")}</h1>
          <p className="finance-sidebar__subtitle">{t("finance.sidebar.subtitle")}</p>
        </div>
      </div>

      <nav className="finance-nav">
        <a
          className={`finance-nav__item ${activeTab === "ledger" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("ledger"); }}
        >
          <span className="material-symbols-outlined filled">account_balance_wallet</span>
          <span>{t("finance.sidebar.ledger")}</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "income" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("income"); }}
        >
          <span className="material-symbols-outlined">trending_up</span>
          <span>{t("finance.sidebar.income")}</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "expense" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("expense"); }}
        >
          <span className="material-symbols-outlined">trending_down</span>
          <span>{t("finance.sidebar.expense")}</span>
        </a>
        <a
          className={`finance-nav__item ${activeTab === "report" ? "active" : ""}`}
          href="#"
          onClick={(e) => { e.preventDefault(); onTabChange("report"); }}
        >
          <span className="material-symbols-outlined">assessment</span>
          <span>{t("finance.sidebar.report")}</span>
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
          <p className="finance-sidebar__user-name">{t("finance.sidebar.userName")}</p>
          <p className="finance-sidebar__user-role">{t("finance.sidebar.userRole")}</p>
        </div>
      </div>
    </aside>
  );
}

export default FinanceSidebar;
