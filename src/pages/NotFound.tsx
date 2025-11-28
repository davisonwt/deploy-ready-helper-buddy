import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentTheme } from "@/utils/dashboardThemes";

const NotFound = () => {
  const location = useLocation();
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: currentTheme.background }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.textPrimary }}>404</h1>
        <p className="text-xl mb-4" style={{ color: currentTheme.textSecondary }}>Oops! Page not found</p>
        <Link 
          to="/" 
          className="underline"
          style={{ color: currentTheme.accent }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = currentTheme.accentLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = currentTheme.accent;
          }}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
