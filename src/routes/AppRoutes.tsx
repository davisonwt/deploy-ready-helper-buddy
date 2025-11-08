import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EmergencyFallback from '../components/EmergencyFallback';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<EmergencyFallback />} />
      <Route path="/products" element={<EmergencyFallback />} />
      <Route path="/login" element={<EmergencyFallback />} />
      <Route path="/register" element={<EmergencyFallback />} />
      <Route path="*" element={<EmergencyFallback />} />
    </Routes>
  );
}

export default AppRoutes;
