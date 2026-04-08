import React, { useState, useRef, useCallback } from 'react';
import { Car, Wrench, Ear, HandHeart, Sprout, ArrowRight, BedDouble, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GigBookingModal } from '@/components/gig/GigBookingModal';
import { EscrowBadge } from '@/components/provider/EscrowBadge';
import { Button } from '@/components/ui/button';

import rideBookImg from '/images/gig/ride-book.jpg';
import serviceBookImg from '/images/gig/service-book.jpg';
import whispererBookImg from '/images/gig/whisperer-book.jpg';
import driverBecomeImg from '/images/gig/driver-become.jpg';
import servicesBecomeImg from '/images/gig/services-become.jpg';
import whispererBecomeImg from '/images/gig/whisperer-become.jpg';
import farmerImg from '/images/providers/farmer.jpg';
import homesteaderImg from '/images/providers/homesteader.jpg';
import manufacturerImg from '/images/providers/manufacturer.jpg';
import connectFarmerImg from '/images/providers/connect-farmer.jpg';
import connectHomesteaderImg from '/images/providers/connect-homesteader.jpg';
import connectManufacturerImg from '/images/providers/connect-manufacturer.jpg';

interface GigActionCardsProps {
  theme: DashboardTheme;
}

function useCarousel(length: number) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((i: number) => {
    const next = (i + length) % length;
    setIndex(next);
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: width * next, behavior: 'smooth' });
    }
  }, [length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    const idx = Math.round(scrollRef.current.scrollLeft / width);
    setIndex(idx);
  }, []);

  return { index, scrollRef, scrollTo, handleScroll };
}

export const GigActionCards: React.FC<GigActionCardsProps> = ({ theme }) => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'ride' | 'service' | 'whisperer'>('ride');
  const navigate = useNavigate();

  const openBooking = (tab: 'ride' | 'service' | 'whisperer') => {
    setInitialTab(tab);
    setBookingOpen(true);
  };

  const bookCards = [
    { key: 'ride', icon: Car, label: 'Ride', desc: 'Book a driver', img: rideBookImg, onClick: () => openBooking('ride') },
    { key: 'service', icon: Wrench, label: 'Service', desc: 'Tribal skills', img: serviceBookImg, onClick: () => openBooking('service') },
    { key: 'whisperer', icon: Ear, label: 'Whisperer', desc: 'Marketing help', img: whispererBookImg, onClick: () => openBooking('whisperer') },
    { key: 'stays', icon: BedDouble, label: 'Stays', desc: 'Holiday & stays', img: '/images/gig/stays-book.jpg', onClick: () => navigate('/stays') },
  ];

  const connectCards = [
    { key: 'farmer', emoji: '🌾', label: 'Farmer', desc: 'Fresh produce', img: connectFarmerImg, href: '/providers?type=farmer' },
    { key: 'homesteader', emoji: '🏡', label: 'Homesteader', desc: 'Handmade goods', img: connectHomesteaderImg, href: '/providers?type=homesteader' },
    { key: 'manufacturer', emoji: '🏭', label: 'Manufacturer', desc: 'Produce at scale', img: connectManufacturerImg, href: '/providers?type=manufacturer' },
  ];

  const becomeCards = [
    { icon: Car, label: 'Driver', desc: 'Register vehicle', img: driverBecomeImg, href: '/register-vehicle' },
    { icon: Wrench, label: 'Services', desc: 'Offer your skills', img: servicesBecomeImg, href: '/register-services' },
    { icon: Ear, label: 'Whisperer', desc: 'Content & marketing', img: whispererBecomeImg, href: '/become-whisperer' },
    { icon: BedDouble, label: 'Stays', desc: 'List your property', img: '/images/gig/stays-become.jpg', href: '/list-your-stay' },
    { emoji: '🌾', label: 'Farmer', desc: 'Grow & sell', img: farmerImg, href: '/register-provider?type=farmer' },
    { emoji: '🏡', label: 'Homesteader', desc: 'Handmade goods', img: homesteaderImg, href: '/register-provider?type=homesteader' },
    { emoji: '🏭', label: 'Manufacturer', desc: 'Produce at scale', img: manufacturerImg, href: '/register-provider?type=manufacturer' },
  ];

  const bookCarousel = useCarousel(bookCards.length);
  const connectCarousel = useCarousel(connectCards.length);

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
                Services
              </h2>
              <p className="text-[10px]" style={{ color: theme.textSecondary }}>
                Book, connect, or become a provider
              </p>
            </div>
          </div>
        </div>

        {/* Book a Service Carousel */}
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            📅 Book a Service
          </p>
          <div className="relative">
            <div
              ref={bookCarousel.scrollRef}
              onScroll={bookCarousel.handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <style>{`.book-carousel::-webkit-scrollbar { display: none; }`}</style>
              {bookCards.map((card) => (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className="min-w-full flex-shrink-0 snap-center block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.01] active:scale-[0.99] relative h-[160px]"
                >
                  <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                  <div className="relative h-full flex flex-col justify-between p-4">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{card.label}</h3>
                      <p className="text-xs text-white/80">{card.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Arrows */}
            <button
              onClick={() => bookCarousel.scrollTo(bookCarousel.index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => bookCarousel.scrollTo(bookCarousel.index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Counter */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
              {bookCarousel.index + 1}/{bookCards.length}
            </div>
          </div>
        </div>

        {/* Connect with Providers Carousel */}
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            🌿 Connect with Providers
          </p>
          <div className="relative">
            <div
              ref={connectCarousel.scrollRef}
              onScroll={connectCarousel.handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {connectCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => navigate(card.href)}
                  className="min-w-full flex-shrink-0 snap-center block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.01] active:scale-[0.99] relative h-[160px]"
                >
                  <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                  <div className="relative h-full flex flex-col justify-between p-4">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-lg">{card.emoji}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{card.label}</h3>
                      <p className="text-xs text-white/80">{card.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Arrows */}
            <button
              onClick={() => connectCarousel.scrollTo(connectCarousel.index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => connectCarousel.scrollTo(connectCarousel.index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Counter */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
              {connectCarousel.index + 1}/{connectCards.length}
            </div>
          </div>
        </div>

        {/* Become a Provider Row (unchanged grid) */}
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            🌱 Become a Provider
          </p>
          <div className="grid grid-cols-3 gap-2">
            {becomeCards.map((card) => (
              <button
                key={card.label + '-become'}
                onClick={() => navigate(card.href)}
                className="block rounded-2xl overflow-hidden transition-all shadow-md text-left hover:scale-[1.02] active:scale-[0.98] relative h-[100px]"
              >
                <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                <div className="relative h-full flex flex-col justify-between p-3">
                  <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {card.icon ? <card.icon className="w-3.5 h-3.5 text-white" /> : <span className="text-sm">{card.emoji}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{card.label}</h3>
                    <p className="text-[9px] text-white/80">{card.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons & Escrow */}
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => navigate('/register-provider')}
            className="w-full h-12 text-base font-semibold"
          >
            <Sprout className="w-5 h-5 mr-2" />
            Register as Provider
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate('/providers')}
            className="w-full h-11"
          >
            Browse All Providers
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <EscrowBadge size="sm" />
      </div>

      <GigBookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialTab={initialTab}
      />
    </>
  );
};