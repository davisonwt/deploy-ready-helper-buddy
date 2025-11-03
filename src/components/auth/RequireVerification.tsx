import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface RequireVerificationProps {
  children: React.ReactNode;
}

export const RequireVerification: React.FC<RequireVerificationProps> = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkVerification = async () => {
      if (!user?.id || authLoading) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is verified in the database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_chatapp_verified')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking verification:', error);
          setIsVerified(false);
        } else {
          setIsVerified(profile?.is_chatapp_verified ?? false);
        }
      } catch (error) {
        console.error('Verification check failed:', error);
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [user?.id, authLoading]);

  // Show loading spinner while checking
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If not authenticated, let ProtectedRoute handle it
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If not verified, redirect to ChatApp
  if (isVerified === false) {
    console.log('🚫 User not verified, redirecting to /chatapp');
    return <Navigate to="/chatapp" state={{ from: location.pathname }} replace />;
  }

  // User is verified, render children
  return <>{children}</>;
};
