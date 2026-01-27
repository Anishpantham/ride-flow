import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { Landing } from '@/pages/Landing';
import { Auth } from '@/pages/Auth';
import { PassengerDashboard } from '@/pages/PassengerDashboard';
import { DriverDashboard } from '@/pages/DriverDashboard';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/passenger'} replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/passenger"
              element={
                <ProtectedRoute role="passenger">
                  <PassengerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute role="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
