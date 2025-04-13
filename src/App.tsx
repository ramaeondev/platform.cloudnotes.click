import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { Toaster as UIToaster } from './components/ui/toaster.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import { useProfile } from './hooks/useProfile.ts';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Index from './pages/Index.tsx';
import SignIn from './pages/SignIn.tsx';
import SignUp from './pages/SignUp.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import ConfirmEmail from './pages/ConfirmEmail.tsx';
import Profile from './pages/Profile.tsx';
import Integrations from './pages/Integrations.tsx';
import About from './pages/About.tsx';
import NotFound from './pages/NotFound.tsx';
import TermsAndConditions from './pages/TermsAndConditions.tsx';
import ProfileSetupModal from './components/ui/ProfileSetupModal.tsx';

// Create a new QueryClient instance outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  }
});

// Create a wrapper component that uses the hook
const AppContent = () => {
  const { data: profile } = useProfile();
  const [isInitialSetupCompleted, setIsInitialSetupCompleted] = useState(true);

  React.useEffect(() => {
    if (profile?.is_initial_setup_completed !== null && profile?.is_initial_setup_completed !== undefined) {
      setIsInitialSetupCompleted(profile.is_initial_setup_completed);
    }
  }, [profile]);

  const handleProfileComplete = () => {
    setIsInitialSetupCompleted(true);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/confirm" element={<ConfirmEmail />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/integrations" 
          element={
            <ProtectedRoute>
              <Integrations />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/about" 
          element={
            <ProtectedRoute>
              <About />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route - handle S3 SPA routing */}
        <Route path="/signup/*" element={<Navigate to="/signup" replace />} />
        <Route path="/signin/*" element={<Navigate to="/signin" replace />} />
        <Route path="/profile/*" element={<Navigate to="/profile" replace />} />
        <Route path="/integrations/*" element={<Navigate to="/integrations" replace />} />
        <Route path="/about/*" element={<Navigate to="/about" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ProfileSetupModal
        email={profile?.email || ''}
        givenName={profile?.first_name || ''}
        isOpen={!isInitialSetupCompleted}
        onComplete={handleProfileComplete}
      />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <UIToaster />
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
