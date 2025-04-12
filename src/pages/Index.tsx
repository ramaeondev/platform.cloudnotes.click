import React from 'react';
import AppLayout from '../components/Layout/AppLayout.tsx';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, signOut } = useAuth();
  
  return (
    <AppLayout />
  );
};

export default Index;
