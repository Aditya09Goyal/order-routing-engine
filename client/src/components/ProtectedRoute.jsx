import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not allowed, redirect to a safe page or dashboard
  return <Navigate to={user.role === 'admin' ? '/' : '/orders'} replace />;
  }

  return children;
};

export default ProtectedRoute;
