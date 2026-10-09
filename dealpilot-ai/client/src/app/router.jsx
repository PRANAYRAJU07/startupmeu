import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { InvestorDirectoryPage } from '../features/investors/InvestorDirectoryPage.jsx';
import { PipelinePage } from '../features/pipeline/PipelinePage.jsx';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return !user ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/investors" element={<InvestorDirectoryPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
