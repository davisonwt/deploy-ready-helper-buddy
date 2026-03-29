import React, { useState } from 'react';
import { Car, Wrench, Ear, HandHeart } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GradientGatewayCard } from './GradientGatewayCard';
import { GigBookingModal } from '@/components/gig/GigBookingModal';

import rideBookImg from '/images/gig/ride-book.jpg';
import serviceBookImg from '/images/gig/service-book.jpg';
import whispererBookImg from '/images/gig/whisperer-book.jpg';
import driverBecomeImg from '/images/gig/driver-become.jpg';
import servicesBecomeImg from '/images/gig/services-become.jpg';
import whispererBecomeImg from '/images/gig/whisperer-become.jpg';

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
              className="block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98] relative h-[100px]"
            >
              <img src={rideBookImg} alt="Ride" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
              <div className="relative h-full flex flex-col justify-between p-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Car className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">Ride</h3>
                  <p className="text-[9px] text-white/80">Book a driver</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => openBooking('service')}
              className="block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98] relative h-[100px]"
            >
              <img src={serviceBookImg} alt="Service" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
              <div className="relative h-full flex flex-col justify-between p-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">Service</h3>
                  <p className="text-[9px] text-white/80">Tribal skills</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => openBooking('whisperer')}
              className="block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98] relative h-[100px]"
            >
              <img src={whispererBookImg} alt="Whisperer" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
              <div className="relative h-full flex flex-col justify-between p-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Ear className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">Whisperer</h3>
                  <p className="text-[9px] text-white/80">Marketing help</p>
                </div>
              </div>
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
              backgroundImage={driverBecomeImg}
            />
            <GradientGatewayCard
              href="/register-services"
              title="Services"
              subtitle="Offer your skills"
              icon={Wrench}
              gradient="linear-gradient(135deg, #b45309, #d97706)"
              backgroundImage={servicesBecomeImg}
            />
            <GradientGatewayCard
              href="/become-whisperer"
              title="Whisperer"
              subtitle="Content & marketing"
              icon={Ear}
              gradient="linear-gradient(135deg, #a21caf, #c026d3)"
              backgroundImage={whispererBecomeImg}
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
