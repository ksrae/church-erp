import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadData } from "../../utils/fileStorage";
import { useAuth } from "../../App";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { getCurrentChurchId } from "../../utils/fileStorage";
import { useLocale } from "../../i18n/LocaleContext";

function ChurchDashboard() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const { auth } = useAuth();
  const admin = auth.type === "church" ? auth.admin : null;

  const [stats, setStats] = useState({ members: 0, income: 0, expense: 0, worships: 0 });
  const [churchName, setChurchName] = useState(t("churchDashboard.defaultChurchName"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [settings, members, finance] = await Promise.all([
        loadData<any>("settings"),
        loadData<any[]>("members"),
        loadData<any>("finance"),
      ]);

      if (settings?.church?.churchName) setChurchName(settings.church.churchName);

      const churchId = getCurrentChurchId();
      let worshipCount = 0;
      if (churchId) {
        const worshipSnap = await getDocs(query(collection(db, "worshipInstances"), where("scheduleId", "!=", null)));
        worshipCount = worshipSnap.size;
      }

      const totalIncome = finance?.transactions?.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0) || 0;
      const totalExpense = finance?.transactions?.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0) || 0;

      setStats({
        members: members?.length || 0,
        income: totalIncome,
        expense: totalExpense,
        worships: worshipCount,
      });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const localeTag = locale === "ko" ? "ko-KR" : "en-US";
  const formatCurrency = (n: number) => {
    if (n === 0) return locale === "ko" ? "₩0" : "$0";
    if (locale === "ko") {
      if (n >= 10000) return `₩${(n / 10000).toLocaleString(localeTag)}만`;
      return `₩${n.toLocaleString(localeTag)}`;
    }
    return `$${n.toLocaleString(localeTag)}`;
  };

  const quickLinks = [
    { path: "/admin/church/members/new", icon: "person_add", label: t("churchDashboard.quickLinks.registerMember"), color: "#3b82f6" },
    { path: "/admin/church/worship", icon: "church", label: t("churchDashboard.quickLinks.worship"), color: "#10b981" },
    { path: "/admin/church/announcements/new", icon: "campaign", label: t("churchDashboard.quickLinks.createAnnouncement"), color: "#f59e0b" },
    { path: "/admin/church/finance", icon: "account_balance_wallet", label: t("churchDashboard.quickLinks.finance"), color: "#8b5cf6" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.375rem" }}>
          {isLoading ? t("churchDashboard.loading") : t("churchDashboard.titleSuffix", { name: churchName })}
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
          {t("churchDashboard.welcome", { name: admin?.displayName || "" })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: t("churchDashboard.kpi.members"), value: t("churchDashboard.kpi.unit.people", { n: stats.members }), icon: "groups", color: "#3b82f6", path: "/admin/church/members" },
          { label: t("churchDashboard.kpi.totalIncome"), value: formatCurrency(stats.income), icon: "payments", color: "#10b981", path: "/admin/church/finance" },
          { label: t("churchDashboard.kpi.totalExpense"), value: formatCurrency(stats.expense), icon: "receipt_long", color: "#f59e0b", path: "/admin/church/finance" },
          { label: t("churchDashboard.kpi.worshipRecords"), value: t("churchDashboard.kpi.unit.records", { n: stats.worships }), icon: "church", color: "#8b5cf6", path: "/admin/church/worship" },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="kpi-card"
            style={{ cursor: "pointer" }}
          >
            <div className={`kpi-card__icon`} style={{ background: `${stat.color}20` }}>
              <span className="material-symbols-outlined" style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div className="kpi-card__content">
              <p className="kpi-card__label">{stat.label}</p>
              <h3 className="kpi-card__value">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: "white", borderRadius: "1rem", padding: "1.5rem", border: "1px solid var(--border-color)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>{t("churchDashboard.quickLinks.title")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          {quickLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                padding: "1.25rem 0.75rem", background: "#f8fafc", border: "1px solid var(--border-color)",
                borderRadius: "0.875rem", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${link.color}10`; e.currentTarget.style.borderColor = `${link.color}40`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.75rem", color: link.color }}>{link.icon}</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>{link.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChurchDashboard;
