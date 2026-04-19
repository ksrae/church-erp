import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getSuperUserEmail, loadChurchAdmin, LoginResult } from "./utils/adminSecurity";
import { setCurrentChurchId } from "./utils/fileStorage";
import { ChurchAdmin } from "./types/church";

// ── 포탈 페이지 (공개) ──
import PortalLayout from "./pages/portal/PortalLayout";
import PortalHome from "./pages/portal/PortalHome";
import PortalBulletins from "./pages/portal/Bulletins";
import PortalNotices from "./pages/portal/Notices";
import PortalSchedule from "./pages/portal/Schedule";
import { RequireMyChurch, ChurchFinder } from "./components/RequireMyChurch";

// ── 관리자 로그인 ──
import AdminLogin from "./pages/admin/AdminLogin";

// ── 슈퍼유저 페이지 ──
import SuperLayout from "./pages/super/SuperLayout";
import SuperDashboard from "./pages/super/SuperDashboard";
import SuperChurches from "./pages/super/Churches";
import SuperPortalPosts from "./pages/super/PortalPosts";

// ── 교회 관리자 ──
import LicenseSetup from "./pages/church/LicenseSetup";
import ChurchLayout from "./pages/church/ChurchLayout";
import ChurchDashboard from "./pages/church/ChurchDashboard";
import Members from "./pages/Members";
import MemberRegistration from "./pages/MemberRegistration";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import WorshipCalendar from "./pages/worship/WorshipCalendar";
import WorshipDetail from "./pages/worship/WorshipDetail";
import Announcements from "./pages/announcements/Announcements";
import AnnouncementEdit from "./pages/announcements/AnnouncementEdit";

// ── Auth Context ──────────────────────────────────────────────────────────────

export type AuthState =
  | { type: "loading" }
  | { type: "public" }
  | { type: "super"; uid: string; email: string; displayName: string; photoURL?: string }
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

function App() {
  const [authState, setAuthState] = useState<AuthState>({ type: "loading" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthState({ type: "public" });
        setCurrentChurchId(null);
        return;
      }

      // 슈퍼유저 확인
      const superEmail = await getSuperUserEmail();
      if (firebaseUser.email && superEmail && firebaseUser.email.toLowerCase() === superEmail.toLowerCase()) {
        setAuthState({
          type: "super",
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          photoURL: firebaseUser.photoURL || undefined,
        });
        setCurrentChurchId(null);
        return;
      }

      // 교회 관리자 확인
      const churchAdmin = await loadChurchAdmin(firebaseUser.uid);
      if (churchAdmin) {
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

  const handleLoginResult = (result: LoginResult) => {
    if (result.type === "super") {
      setAuthState({ type: "super", uid: result.uid, email: result.email, displayName: result.displayName, photoURL: result.photoURL });
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
          <p>잠시만 기다려주세요...</p>
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
            <Route path="bulletins" element={<RequireMyChurch hint="주보를 보려면 먼저 내 교회를 선택하세요"><PortalBulletins /></RequireMyChurch>} />
            <Route path="notices" element={<RequireMyChurch hint="교회 소식을 보려면 먼저 내 교회를 선택하세요"><PortalNotices /></RequireMyChurch>} />
            <Route path="schedule" element={<RequireMyChurch hint="교회 일정을 보려면 먼저 내 교회를 선택하세요"><PortalSchedule /></RequireMyChurch>} />
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
            <Route path="portal" element={<SuperPortalPosts />} />
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
