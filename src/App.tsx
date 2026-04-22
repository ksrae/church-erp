import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getSuperAccess, classifySuperRole, loadChurchAdmin, LoginResult, LICENSE_RESET_REASON_KEY } from "./utils/adminSecurity";
import { setCurrentChurchId } from "./utils/fileStorage";
import { ChurchAdmin, Church, getChurchStatus } from "./types/church";
import { useLocale } from "./i18n/LocaleContext";

// ── 포탈 페이지 (공개) ──
import PortalLayout from "./pages/portal/PortalLayout";
import PortalHome from "./pages/portal/PortalHome";
import PortalNotices from "./pages/portal/Notices";
import PortalSchedule from "./pages/portal/Schedule";
import { RequireMyChurch, ChurchFinder } from "./components/RequireMyChurch";

// ── 관리자 로그인 ──
import AdminLogin from "./pages/admin/AdminLogin";

// ── 슈퍼유저 페이지 ──
import SuperLayout from "./pages/super/SuperLayout";
import SuperDashboard from "./pages/super/SuperDashboard";
import SuperChurches from "./pages/super/Churches";
import SuperChangeRequests from "./pages/super/ChangeRequests";
import SuperStatusRequests from "./pages/super/StatusRequests";
import SuperAdmins from "./pages/super/SuperAdmins";

// ── 교회 관리자 ──
import LicenseSetup from "./pages/church/LicenseSetup";
import ChurchLayout from "./pages/church/ChurchLayout";
import ChurchDashboard from "./pages/church/ChurchDashboard";
import ChurchPortalSettings from "./pages/church/ChurchPortalSettings";
import Members from "./pages/Members";
import MemberRegistration from "./pages/MemberRegistration";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Resources from "./pages/Resources";
import WorshipCalendar from "./pages/worship/WorshipCalendar";
import WorshipDetail from "./pages/worship/WorshipDetail";
import Announcements from "./pages/announcements/Announcements";
import AnnouncementEdit from "./pages/announcements/AnnouncementEdit";

// ── Auth Context ──────────────────────────────────────────────────────────────

export type AuthState =
  | { type: "loading" }
  | { type: "public" }
  | { type: "super"; uid: string; email: string; displayName: string; photoURL?: string; isPrimary: boolean }
  | { type: "church"; admin: ChurchAdmin }
  | { type: "pending_license"; uid: string; email: string; displayName: string; photoURL?: string };

const AuthContext = createContext<{ auth: AuthState; setAuth: (a: AuthState) => void }>({
  auth: { type: "loading" },
  setAuth: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Guards ────────────────────────────────────────────────────────────────────

function SuperGuard({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth.type === "loading") return null;
  if (auth.type !== "super") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function ChurchGuard({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth.type === "loading") return null;
  if (auth.type === "pending_license") return <Navigate to="/admin/church/setup" replace />;
  if (auth.type !== "church") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────

/** 교회 관리자 상태를 pending_license 로 전환하면서 사유를 기록한다. Firebase Auth 세션은 유지. */
async function softResetChurchAdmin(
  firebaseUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null },
  reasonKey: string,
  setAuthState: (a: AuthState) => void,
  defaultDisplayName: string,
) {
  try { await deleteDoc(doc(db, "churchAdmins", firebaseUser.uid)); } catch { /* ignore */ }
  sessionStorage.setItem(LICENSE_RESET_REASON_KEY, reasonKey);
  setCurrentChurchId(null);
  setAuthState({
    type: "pending_license",
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || firebaseUser.email || defaultDisplayName,
    photoURL: firebaseUser.photoURL || undefined,
  });
}

function App() {
  const { t } = useLocale();
  const [authState, setAuthState] = useState<AuthState>({ type: "loading" });
  const defaultAdmin = t("layout.defaultAdmin");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthState({ type: "public" });
        setCurrentChurchId(null);
        return;
      }

      // 슈퍼유저 또는 슈퍼유저 대리 확인
      const access = await getSuperAccess();
      const role = firebaseUser.email ? classifySuperRole(firebaseUser.email, access) : "none";
      if (role === "primary" || role === "delegate") {
        setAuthState({
          type: "super",
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email || defaultAdmin,
          photoURL: firebaseUser.photoURL || undefined,
          isPrimary: role === "primary",
        });
        setCurrentChurchId(null);
        return;
      }

      // 교회 관리자 확인
      const churchAdmin = await loadChurchAdmin(firebaseUser.uid);
      if (churchAdmin) {
        // 소속 교회의 상태 확인 — 삭제/정지 시 관리자 권한을 해제하고 라이선스 재등록 경로로 보냄
        try {
          const churchSnap = await getDoc(doc(db, "churches", churchAdmin.churchId));
          if (!churchSnap.exists()) {
            await softResetChurchAdmin(
              firebaseUser,
              t("app.resetReason.deleted"),
              setAuthState,
              defaultAdmin,
            );
            return;
          }
          const status = getChurchStatus(churchSnap.data() as Church);
          if (status === "suspended") {
            await softResetChurchAdmin(
              firebaseUser,
              t("app.resetReason.suspended"),
              setAuthState,
              defaultAdmin,
            );
            return;
          }
        } catch { /* 네트워크 오류는 세션 유지 */ }

        setAuthState({ type: "church", admin: churchAdmin });
        setCurrentChurchId(churchAdmin.churchId);
        return;
      }

      // 로그인했지만 라이선스 미등록
      setAuthState({
        type: "pending_license",
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email || "",
        photoURL: firebaseUser.photoURL || undefined,
      });
    });
    return unsub;
  }, []);

  // 세션 내 교회 상태 실시간 감지 — 삭제/정지 시 soft-reset 후 라이선스 재등록 플로우로 전환
  useEffect(() => {
    if (authState.type !== "church") return;
    const churchId = authState.admin.churchId;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const snap = await getDoc(doc(db, "churches", churchId));
        if (cancelled) return;
        const fbUser = auth.currentUser;
        if (!fbUser) return;
        if (!snap.exists()) {
          await softResetChurchAdmin(
            fbUser,
            t("app.resetReason.deletedLive"),
            setAuthState,
            defaultAdmin,
          );
          return;
        }
        if (getChurchStatus(snap.data() as Church) === "suspended") {
          await softResetChurchAdmin(
            fbUser,
            t("app.resetReason.suspendedLive"),
            setAuthState,
            defaultAdmin,
          );
        }
      } catch { /* ignore */ }
    };
    tick();
    const interval = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [authState.type === "church" ? (authState as any).admin.churchId : null]);

  const handleLoginResult = (result: LoginResult) => {
    if (result.type === "super") {
      setAuthState({ type: "super", uid: result.uid, email: result.email, displayName: result.displayName, photoURL: result.photoURL, isPrimary: result.isPrimary });
    } else if (result.type === "church") {
      setAuthState({ type: "church", admin: result.admin });
      setCurrentChurchId(result.admin.churchId);
    } else if (result.type === "pending_license") {
      setAuthState({ type: "pending_license", uid: result.uid, email: result.email, displayName: result.displayName, photoURL: result.photoURL });
    }
  };

  if (authState.type === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem", animation: "spin 1s linear infinite" }}>autorenew</span>
          <p>{t("app.loading")}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth: authState, setAuth: setAuthState }}>
      <BrowserRouter>
        <Routes>
          {/* ── 공개 포탈 (메인) ── */}
          <Route path="/" element={<PortalLayout />}>
            <Route index element={<PortalHome />} />
            <Route path="churches" element={<ChurchFinder />} />
            <Route path="notices" element={<RequireMyChurch hint={t("app.hint.selectForNotices")}><PortalNotices /></RequireMyChurch>} />
            <Route path="schedule" element={<RequireMyChurch hint={t("app.hint.selectForSchedule")}><PortalSchedule /></RequireMyChurch>} />
          </Route>

          {/* ── 관리자 로그인 ── */}
          <Route
            path="/admin/login"
            element={
              authState.type === "super" ? <Navigate to="/admin/super/dashboard" replace /> :
              authState.type === "church" ? <Navigate to="/admin/church" replace /> :
              authState.type === "pending_license" ? <Navigate to="/admin/church/setup" replace /> :
              <AdminLogin onLogin={handleLoginResult} />
            }
          />

          {/* ── 라이선스 키 입력 ── */}
          <Route
            path="/admin/church/setup"
            element={
              authState.type === "pending_license"
                ? <LicenseSetup pendingUser={authState} onSetupComplete={(admin) => { setAuthState({ type: "church", admin }); setCurrentChurchId(admin.churchId); }} />
                : <Navigate to="/admin/login" replace />
            }
          />

          {/* ── 슈퍼유저 백오피스 ── */}
          <Route path="/admin/super" element={<SuperGuard><SuperLayout /></SuperGuard>}>
            <Route index element={<Navigate to="/admin/super/dashboard" replace />} />
            <Route path="dashboard" element={<SuperDashboard />} />
            <Route path="churches" element={<SuperChurches />} />
            <Route path="change-requests" element={<SuperChangeRequests />} />
            <Route path="status-requests" element={<SuperStatusRequests />} />
            <Route path="admins" element={<SuperAdmins />} />
          </Route>

          {/* ── 교회 관리자 ── */}
          <Route path="/admin/church" element={<ChurchGuard><ChurchLayout /></ChurchGuard>}>
            <Route index element={<ChurchDashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="members/new" element={<MemberRegistration />} />
            <Route path="members/edit/:id" element={<MemberRegistration />} />
            <Route path="finance" element={<Finance />} />
            <Route path="worship" element={<WorshipCalendar />} />
            <Route path="worship/:id" element={<WorshipDetail />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="announcements/new" element={<AnnouncementEdit />} />
            <Route path="announcements/edit/:id" element={<AnnouncementEdit />} />
            <Route path="resources" element={<Resources />} />
            <Route path="portal" element={<ChurchPortalSettings />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* ── 기타 리다이렉트 ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
