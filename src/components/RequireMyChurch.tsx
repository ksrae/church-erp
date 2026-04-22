import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Church, getChurchStatus } from "../types/church";
import PortalInquiryModal from "./PortalInquiryModal";
import { useLocale } from "../i18n/LocaleContext";

export const MY_CHURCH_KEY = "church_portal_my_church";
export const MY_CHURCH_CHANGED_KEY = "church_portal_my_church_changed";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function getMyChurchId(): string | null {
  return localStorage.getItem(MY_CHURCH_KEY);
}

export function getLastChangeDate(): string | null {
  return localStorage.getItem(MY_CHURCH_CHANGED_KEY);
}

// 오늘 이미 교회를 변경했는지 (최초 선택은 제한 없음)
export function canChangeToday(): boolean {
  const last = getLastChangeDate();
  if (!last) return true;
  return last !== todayISO();
}

export function setMyChurchId(id: string): void {
  const previous = getMyChurchId();
  localStorage.setItem(MY_CHURCH_KEY, id);
  // 실제로 바뀐 경우에만 변경일을 기록 (같은 교회 재선택은 변경으로 보지 않음)
  if (previous && previous !== id) {
    localStorage.setItem(MY_CHURCH_CHANGED_KEY, todayISO());
  }
  window.dispatchEvent(new Event("mychurch:changed"));
}

export function clearMyChurchId(): void {
  localStorage.removeItem(MY_CHURCH_KEY);
  window.dispatchEvent(new Event("mychurch:changed"));
}

export function useMyChurchId(): string | null {
  const [id, setId] = useState<string | null>(() => getMyChurchId());
  useEffect(() => {
    const handler = () => setId(getMyChurchId());
    window.addEventListener("mychurch:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("mychurch:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // 내 교회가 정지 상태이면 자동 해제
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "churches", id));
        if (cancelled) return;
        if (!snap.exists()) {
          clearMyChurchId();
          return;
        }
        const status = getChurchStatus(snap.data() as Church);
        if (status === "suspended") {
          clearMyChurchId();
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return id;
}

interface RequireMyChurchProps {
  children: ReactNode;
  hint?: string;
}

export function RequireMyChurch({ children, hint }: RequireMyChurchProps) {
  const myChurchId = useMyChurchId();
  if (!myChurchId) return <ChurchFinder inline hint={hint} />;
  return <>{children}</>;
}

interface ChurchFinderProps {
  inline?: boolean;
  hint?: string;
}

export function ChurchFinder({ inline, hint }: ChurchFinderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const myChurchId = useMyChurchId();
  const hasPrior = !!myChurchId;
  const allowedToday = canChangeToday();
  const [inquiryOpen, setInquiryOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 정지된 교회는 isActive=false 로 저장되므로 쿼리 단계에서 제외.
        // 보류(hold)는 isActive=true 를 유지하므로 성도 포탈에 계속 노출됨.
        const snap = await getDocs(query(collection(db, "churches"), where("isActive", "==", true)));
        setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
      } catch (e) { console.error(e); }
      setIsLoading(false);
    })();
  }, []);

  const filtered = churches.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.pastorName || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q)
    );
  });

  const handleSelect = (c: Church) => {
    // 이미 내 교회가 있고, 다른 교회로 바꾸려는데 오늘 이미 바꾼 경우 차단
    if (hasPrior && c.id !== myChurchId && !allowedToday) {
      alert(t("portal.finder.blockAlert"));
      return;
    }
    setMyChurchId(c.id);
    if (!inline) navigate(location.state?.returnTo || "/");
  };

  return (
    <div className="portal-page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>{t("portal.finder.overline")}</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>
          {hint ? hint : hasPrior ? t("portal.finder.titleChange") : t("portal.finder.titleFirst")}
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          {t("portal.finder.hintLine")}
          {hasPrior && t("portal.finder.oncePerDayHint")}
        </p>
        {hasPrior && !allowedToday && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "0.875rem" }}>
            {t("portal.finder.alreadyChangedToday")}
          </div>
        )}
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <span className="material-symbols-outlined" style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1.25rem", pointerEvents: "none" }}>search</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("portal.finder.searchPlaceholder")}
          style={{ width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", fontSize: "0.95rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", outline: "none", transition: "all 0.15s", boxSizing: "border-box" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#16649c")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem", animation: "spin 1s linear infinite" }}>autorenew</span>
          {t("portal.finder.loading")}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : churches.length === 0 ? (
        <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "2.5rem", textAlign: "center", border: "1px solid #fde68a" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#d97706", display: "block", marginBottom: "0.75rem" }}>business</span>
          <p style={{ color: "#92400e", fontWeight: 700, marginBottom: "0.375rem", fontSize: "1rem" }}>{t("portal.finder.noChurchesTitle")}</p>
          <p style={{ color: "#b45309", fontSize: "0.875rem", margin: 0 }}>
            {t("portal.finder.noChurchesDesc")}
          </p>
          <button
            type="button"
            onClick={() => setInquiryOpen(true)}
            style={{ display: "inline-block", marginTop: "1rem", padding: "0.625rem 1.25rem", background: "#d97706", color: "white", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
          >
            {t("portal.finder.sendRegistrationInquiry")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>search_off</span>
          {t("portal.finder.noSearchResult", { query: searchQuery })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }}>
          {filtered.map((c) => {
            const isCurrent = c.id === myChurchId;
            const disabled = hasPrior && !isCurrent && !allowedToday;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                disabled={disabled}
                style={{
                  textAlign: "left",
                  background: isCurrent ? "#eff6ff" : "white",
                  border: isCurrent ? "2px solid #16649c" : "1px solid #e2e8f0",
                  borderRadius: "14px", padding: "1.25rem",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  transition: "all 0.15s", display: "flex", flexDirection: "column", gap: "0.625rem",
                }}
                onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "#16649c"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(22,100,156,0.12)"; } }}
                onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.borderColor = isCurrent ? "#16649c" : "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; } }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {c.logo ? (
                    <img src={c.logo} alt="" style={{ width: "2.75rem", height: "2.75rem", borderRadius: "10px", objectFit: "cover", background: "#eff6ff" }} />
                  ) : (
                    <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "#16649c", fontSize: "1.375rem" }}>church</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    {c.pastorName && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0" }}>{t("portal.home.pastorPrefix", { name: c.pastorName })}</p>}
                  </div>
                  {isCurrent && <span className="material-symbols-outlined" style={{ color: "#16649c" }}>check_circle</span>}
                </div>
                {c.address && (
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>location_on</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</span>
                  </p>
                )}
                {!isCurrent && (
                  <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", color: disabled ? "#94a3b8" : "#16649c", fontWeight: 600, fontSize: "0.85rem" }}>
                    {disabled ? t("portal.finder.cannotChangeToday") : hasPrior ? t("portal.finder.changeToChurch") : t("portal.finder.selectChurch")}
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {inquiryOpen && (
        <PortalInquiryModal
          defaultContext="portal_registration"
          onClose={() => setInquiryOpen(false)}
        />
      )}
    </div>
  );
}

export default RequireMyChurch;
