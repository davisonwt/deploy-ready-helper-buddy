import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServiceProviderRegistrationForm from '@/components/services/ServiceProviderRegistrationForm';

const RegisterServicesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              🛠️ Help Grow Our Community!
            </h1>
            <p className="text-muted-foreground text-lg">
              Offer your skills and services to fellow sowers who need your expertise.
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <ServiceProviderRegistrationForm />
      </div>
    </div>
  );
};

export default RegisterServicesPage;
