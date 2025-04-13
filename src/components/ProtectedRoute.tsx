import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isProfileLoading } = useProfile();
  const location = useLocation();

  console.log('[ProtectedRoute] Rendering with:', {
    user,
    isAuthLoading,
    isProfileLoading,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('[ProtectedRoute] Auth state changed:', {
      user,
      isAuthLoading,
      isProfileLoading,
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [user, isAuthLoading, isProfileLoading, location.pathname]);

  // Show loading state while checking auth and profile
  if (isAuthLoading || isProfileLoading) {
    console.log('[ProtectedRoute] Showing loading spinner');
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Render the protected content
  console.log('[ProtectedRoute] Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
