import React from 'react';
import { AmbassadorSeal } from '@/components/ambassador/AmbassadorSeal';
import { AmbassadorToolkit } from '@/components/ambassador/AmbassadorToolkit';
import { useAuth } from '@/hooks/useAuth';

export default function AmbassadorHubPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6" style={{ background: 'radial-gradient(ellipse at top, #0f1419 0%, #0a0a0f 60%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Welcome Header */}
        <div className="flex items-center gap-5 mb-10">
          <AmbassadorSeal size="md" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome to the Inner Circle
            </h1>
            <p className="text-amber-300 font-medium">Your Orchard Companions Await, Ambassador</p>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className="rounded-2xl p-5 mb-8 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(13,148,136,0.1), rgba(245,158,11,0.1))',
            border: '1px solid rgba(13,148,136,0.2)',
          }}
        >
          <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
          <div>
            <p className="text-white font-medium text-sm">Ambassador Status: <span className="text-teal-400">Active</span></p>
            <p className="text-white/40 text-xs">Your Orchard Companions are standing by. Select a tool below to invite their help.</p>
          </div>
        </div>

        {/* Toolkit Grid */}
        <AmbassadorToolkit />
      </div>
    </div>
  );
}
