import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';

const Index = () => {
  const navigate = useNavigate();
  
  // This will be used to check if the user is authenticated
  // For now it's a stub that will be implemented with Supabase later
  const isAuthenticated = false;

  useEffect(() => {
    // Redirect to signin page if not authenticated
    if (!isAuthenticated) {
      navigate('/signin');
    }
  }, [isAuthenticated, navigate]);

  // If authenticated, render the app layout
  // Otherwise, this will redirect to signin
  return isAuthenticated ? <AppLayout /> : null;
};

export default Index;
