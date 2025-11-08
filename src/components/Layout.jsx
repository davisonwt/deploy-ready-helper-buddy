import React from "react";

// Minimal, stable layout to bypass hook dispatcher issues
// Emergency recovery: no hooks, no context dependencies
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <main role="main" className="min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
