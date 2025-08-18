import React from 'react';
import Layout from '@/components/Layout';
import { OrganizationPaymentInterface } from '@/components/OrganizationPaymentInterface';

export default function SupportUsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <OrganizationPaymentInterface />
      </div>
    </Layout>
  );
}