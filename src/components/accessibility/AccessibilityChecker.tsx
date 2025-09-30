import { useEffect } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { useUser } from '@supabase/auth-helpers-react';

// Only run accessibility checks in development
const AccessibilityChecker = () => {
  const user = useUser();

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Dynamically import axe-core in development only
      import('@axe-core/react').then((axe) => {
        axe.default(React, ReactDOM, 1000, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
          },
        });
        
        console.log('♿ Accessibility checker enabled - check console for violations');
      }).catch((error) => {
        console.warn('Could not load accessibility checker:', error);
      });
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Add focus-visible polyfill for older browsers
      const focusVisibleScript = document.createElement('script');
      focusVisibleScript.src = 'https://unpkg.com/focus-visible@5.2.0/dist/focus-visible.min.js';
      document.head.appendChild(focusVisibleScript);

      // Add skip link styles
      const skipLinkStyles = document.createElement('style');
      skipLinkStyles.textContent = `
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          padding: 8px;
          z-index: 1000;
          text-decoration: none;
          border-radius: 4px;
          transition: top 0.3s;
        }
        .skip-link:focus {
          top: 6px;
        }
      `;
      document.head.appendChild(skipLinkStyles);

      return () => {
        // Cleanup
        if (focusVisibleScript.parentNode) {
          focusVisibleScript.parentNode.removeChild(focusVisibleScript);
        }
        if (skipLinkStyles.parentNode) {
          skipLinkStyles.parentNode.removeChild(skipLinkStyles);
        }
      };
    }
  }, []);

  // Add skip links for keyboard users
  if (import.meta.env.DEV) {
    return (
      <div>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
      </div>
    );
  }

  return null;
};

export default AccessibilityChecker;