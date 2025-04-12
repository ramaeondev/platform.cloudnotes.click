import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Rendering with:', {
    isAuthenticated,
    isLoading,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('[ProtectedRoute] Auth state changed:', {
      isAuthenticated,
      isLoading,
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, isLoading, location.pathname]);

  if (isLoading) {
    console.log('[ProtectedRoute] Showing loading spinner');
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
