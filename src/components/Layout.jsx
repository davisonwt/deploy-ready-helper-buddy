import React from 'react';
import PublicNav from '@/components/layout/PublicNav';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-warning/10">
      <PublicNav />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;

