import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'next/router';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  if (!token) {
    navigate('/auth/login');
  }

  return children;
};
export default ProtectedRoute;