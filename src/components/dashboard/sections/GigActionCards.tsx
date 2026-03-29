import React, { useState } from 'react';
import { Car, Wrench, Ear, CalendarPlus, HandHeart, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GradientGatewayCard } from './GradientGatewayCard';
import { GigBookingModal } from '@/components/gig/GigBookingModal';

interface GigActionCardsProps {
  theme: DashboardTheme;
}

export const GigActionCards: React.FC<GigActionCardsProps> = ({ theme }) => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'ride' | 'service' | 'whisperer'>('ride');

  const openBooking = (tab: 'ride' | 'service' | 'whisperer') => {
    setInitialTab(tab);
    setBookingOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Section Label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
              <HandHeart className="w-5 h-5" style={{ color: theme.accent }} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
                Gig Services
              </h2>
              <p className="text-[10px]" style={{ color: theme.textSecondary }}>
                Book or become a provider
              </p>
            </div>
          </div>
        </div>

        {/* Book Row */}
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            📅 Book a Service
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => openBooking('ride')}
              className="block rounded-2xl p-4 transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                <Car className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-white text-xs">Ride</h3>
              <p className="text-[9px] text-white/70">Book a driver</p>
            </button>

            <button
              onClick={() => openBooking('service')}
              className="block rounded-2xl p-4 transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-white text-xs">Service</h3>
              <p className="text-[9px] text-white/70">Tribal skills</p>
            </button>

            <button
              onClick={() => openBooking('whisperer')}
              className="block rounded-2xl p-4 transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #9333ea, #db2777)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                <Ear className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-white text-xs">Whisperer</h3>
              <p className="text-[9px] text-white/70">Marketing help</p>
            </button>
          </div>
        </div>

        {/* Become Row */}
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            🌱 Become a Provider
          </p>
          <div className="grid grid-cols-3 gap-2">
            <GradientGatewayCard
              href="/register-vehicle"
              title="Driver"
              subtitle="Register vehicle"
              icon={Car}
              gradient="linear-gradient(135deg, #d97706, #f59e0b)"
            />
            <GradientGatewayCard
              href="/register-services"
              title="Services"
              subtitle="Offer your skills"
              icon={Wrench}
              gradient="linear-gradient(135deg, #b45309, #d97706)"
            />
            <GradientGatewayCard
              href="/become-whisperer"
              title="Whisperer"
              subtitle="Prayer support"
              icon={Ear}
              gradient="linear-gradient(135deg, #a21caf, #c026d3)"
            />
          </div>
        </div>
      </div>

      <GigBookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialTab={initialTab}
      />
    </>
  );
};
