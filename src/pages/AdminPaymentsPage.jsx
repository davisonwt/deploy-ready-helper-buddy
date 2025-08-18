import React from 'react';
import Layout from '@/components/Layout';
import { AdminPaymentDashboard } from '@/components/AdminPaymentDashboard';

export default function AdminPaymentsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <AdminPaymentDashboard />
      </div>
    </Layout>
  );
}