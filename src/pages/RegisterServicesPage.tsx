import React from 'react';
import { Wrench, Users, DollarSign, Sparkles } from 'lucide-react';
import ServiceProviderRegistrationForm from '@/components/services/ServiceProviderRegistrationForm';
import { FormShell } from '@/components/forms';

const RegisterServicesPage: React.FC = () => {
  return (
    <FormShell
      icon={Wrench}
      eyebrow="serve the tribe with your gifts"
      title="Help Grow Our Community"
      subtitle="Offer your skills and services to fellow sowers who need your expertise — from craftsmanship to consulting."
      backTo="/dashboard"
      backLabel="Back to dashboard"
      size="lg"
      benefits={[
        { icon: DollarSign, label: 'Set your own rates' },
        { icon: Users, label: 'Reach 1000s of sowers' },
        { icon: Sparkles, label: 'Get verified' },
      ]}
    >
      <ServiceProviderRegistrationForm />
    </FormShell>
  );
};

export default RegisterServicesPage;
