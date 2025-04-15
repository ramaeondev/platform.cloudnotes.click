import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { useProfile } from './hooks/useProfile.ts';
import { Toaster as HotToast } from 'react-hot-toast';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import { Toaster as UIToaster } from './components/ui/toaster.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Index from './pages/Index.tsx';
import SignIn from './pages/SignIn.tsx';
import SignUp from './pages/SignUp.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import TermsAndConditions from './pages/TermsAndConditions.tsx';
import ConfirmEmail from './pages/ConfirmEmail.tsx';
import Profile from './pages/Profile.tsx';
import Integrations from './pages/Integrations.tsx';
import About from './pages/About.tsx';
import NotFound from './pages/NotFound.tsx';
import ProfileSetupModal from './components/ui/ProfileSetupModal.tsx';
import ProfileDiagnostics from './components/diagnostics/ProfileDiagnostics.tsx';
import { Loader2 } from 'lucide-react';

// Create a new QueryClient instance outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const AppContent: React.FC = () => {
  const { isLoading, user } = useAuth();
  const { data: profile } = useProfile();
  const [isInitialSetupCompleted, setIsInitialSetupCompleted] = useState(true); // Start with true to prevent flash
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  useEffect(() => {
    // Set initial setup value based on profile data
    if (profile) {
      setIsInitialSetupCompleted(!!profile.is_initial_setup_completed);
      
      // If setup is not completed, add 3-second delay before showing modal
      if (!profile.is_initial_setup_completed) {
        const timer = setTimeout(() => {
          setShowProfileModal(true);
        }, 3000); // 3000ms = 3 seconds
        
        return () => clearTimeout(timer);
      }
    }
  }, [profile]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  const handleProfileComplete = () => {
    setIsInitialSetupCompleted(true);
    setShowProfileModal(false);
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
        <Route 
          path="/diagnose" 
          element={
            <ProtectedRoute>
              <ProfileDiagnostics />
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
        givenName={profile?.name || ''}
        isOpen={showProfileModal}
        onComplete={handleProfileComplete}
        initialData={profile ? {
          first_name: profile.name,
          last_name: profile.last_name,
          username: profile.username,
          email: profile.email
        } : undefined}
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
