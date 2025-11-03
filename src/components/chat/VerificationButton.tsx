import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface VerificationButtonProps {
  roomId: string;
  isVerified?: boolean;
}

export const VerificationButton: React.FC<VerificationButtonProps> = ({ 
  roomId, 
  isVerified = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(isVerified);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-chatapp', {
        body: { roomId }
      });

      if (error) throw error;

      if (data?.success) {
        setVerified(true);
        toast({
          title: "Account Verified!",
          description: "You can now access all features of Sow2Grow.",
        });

        // Wait 2 seconds then redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast({
        title: "Verification Failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Account Verified!</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleVerify}
      disabled={loading}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : (
        'Verify my account'
      )}
    </Button>
  );
};
