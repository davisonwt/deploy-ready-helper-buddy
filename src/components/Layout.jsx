import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;

