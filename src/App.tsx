import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberRegistration from "./pages/MemberRegistration";
import Finance from "./pages/Finance";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Layout from "./components/Layout";

const AUTH_STORAGE_KEY = "church_erp_auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 앱 시작 시 저장된 자동 로그인 정보 확인
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.autoLogin && authData.userId && authData.password) {
          setIsAuthenticated(true);
        }
      } catch {
        // 파싱 에러 시 무시
      }
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // 로그아웃 시 자동 로그인 정보 삭제
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // 인증 확인 중일 때 로딩 표시
  if (isCheckingAuth) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="members/new" element={<MemberRegistration />} />
          <Route path="members/edit/:id" element={<MemberRegistration />} />
          <Route path="finance" element={<Finance />} />
          <Route path="resources" element={<Resources />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
