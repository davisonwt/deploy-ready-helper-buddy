import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SecurityQuestionsSetup from "@/components/auth/SecurityQuestionsSetup";

export default function SecurityQuestionsSetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = () => {
    toast({
      title: "Security Questions Saved! 🔒",
      description: "Your account is now fully protected. Redirecting to dashboard...",
    });
    
    // Navigate to dashboard after setup
    setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Almost There! 🎉
          </h1>
          <p className="text-muted-foreground">
            Set up your security questions to protect your account.
          </p>
        </div>
        <SecurityQuestionsSetup onComplete={handleComplete} isRegistration={true} />
      </div>
    </div>
  );
}
