import React from 'react';
import { Layout } from '@/components/Layout';
import { AdminPaymentDashboard } from '@/components/AdminPaymentDashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AdminPaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'gosat']}>
      <Layout>
        <div className="container mx-auto py-8">
          <AdminPaymentDashboard />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}