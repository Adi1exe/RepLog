import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';
import GithubCallback from './pages/GithubCallback';

function ProtectedRoute({ children, requireVerified = true }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (requireVerified && user.is_email_verified === false) return <Navigate to="/verify-email" />;
  return children;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "missing_client_id"}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/verify-email" element={
              <ProtectedRoute requireVerified={false}>
                <VerifyEmail />
              </ProtectedRoute>
            } />
            <Route path="/auth/github/callback" element={<GithubCallback />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
