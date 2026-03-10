
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberRegistration from "./pages/MemberRegistration";
import Finance from "./pages/Finance";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Notifications from "./pages/Notifications"; // Import Notifications
import Layout from "./components/Layout";
import { AdminUser, rolePermissions, AdminData } from "./types/admin";
import { loadAdminData } from "./utils/adminSecurity";

const AUTH_STORAGE_KEY = "church_erp_auth";

interface AuthData {
  userId: string;
  passwordHash: string;
  autoLogin: boolean;
  role?: string;
  username?: string;
}

// Route protection component
function ProtectedRoute({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser | null;
  requiredPaths?: string[];
}) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has permission for current path
  const userPermissions = rolePermissions[user.role];

  // Super admin has access to everything
  if (userPermissions.includes("*")) {
    return <>{children}</>;
  }

  // Check specific path permissions
  const currentPath = location.pathname;
  const hasAccess = userPermissions.some(permission => {
    if (permission === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(permission);
  });

  if (!hasAccess) {
    // Redirect to dashboard with access denied
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check saved auth on startup
  useEffect(() => {
    const checkAuth = async () => {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        try {
          const authData: AuthData = JSON.parse(savedAuth);
          // Only proceed if autoLogin is true and we have basic ID info
          // We do NOT trust localStorage for role - we fetch true data from secure storage
          if (authData.autoLogin && authData.userId) {
            try {
              // Load actual admin data from secure storage
              const adminData = await loadAdminData<AdminData>();

              if (adminData && adminData.admins) {
                const targetUsername = authData.username || authData.userId;
                const foundAdmin = adminData.admins.find(a => a.username === targetUsername);

                // Verify user exists AND password hash matches (security check)
                if (foundAdmin && foundAdmin.passwordHash === authData.passwordHash) {
                  console.log("✅ Auto-login successful:", foundAdmin.username, foundAdmin.role);
                  setCurrentUser(foundAdmin);
                } else {
                  console.warn("⚠️ Auto-login failed: Invalid credentials or user not found");
                  localStorage.removeItem(AUTH_STORAGE_KEY); // Clear invalid auth
                }
              }
            } catch (err) {
              console.error("❌ Failed to load admin data for auth check:", err);
            }
          }
        } catch (e) {
          console.error("Auth data parse error", e);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (user: AdminUser) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
  };

  // Loading state
  if (isCheckingAuth) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/"
          element={
            currentUser ? (
              <Layout onLogout={handleLogout} currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="members"
            element={
              <ProtectedRoute user={currentUser} requiredPaths={["/members"]}>
                <Members />
              </ProtectedRoute>
            }
          />
          <Route
            path="members/new"
            element={
              <ProtectedRoute user={currentUser} requiredPaths={["/members"]}>
                <MemberRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="members/edit/:id"
            element={
              <ProtectedRoute user={currentUser} requiredPaths={["/members"]}>
                <MemberRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance"
            element={
              <ProtectedRoute user={currentUser} requiredPaths={["/finance"]}>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path="resources"
            element={
              <ProtectedRoute user={currentUser} requiredPaths={["/resources"]}>
                <Resources />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="notifications" element={<Notifications />} /> {/* Add Route */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
