import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import type { UserRole } from '../../types/database.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying administrator session..." />
      </div>
    );
  }

  if (!isConfigured) {
    return <>{children}</>;
  }

  // Admin section: Unauthenticated or non-admin users are directed to /admin/login
  if (requiredRole === 'admin') {
    if (!user || profile?.role !== 'admin') {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};
