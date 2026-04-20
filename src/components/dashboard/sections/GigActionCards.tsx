import React, { useState, useRef, useCallback } from 'react';
import { Car, Wrench, Ear, HandHeart, Sprout, ArrowRight, BedDouble, ChevronLeft, ChevronRight, Play, UserPlus, X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GigBookingModal } from '@/components/gig/GigBookingModal';
import { EscrowBadge } from '@/components/provider/EscrowBadge';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './SectionHeading';
import { SubSectionLabel } from './SubSectionLabel';
import { CarouselBannerVideo } from './CarouselBannerVideo';

const rideBookImg = '/images/gig/ride-book.jpg';
const serviceBookImg = '/images/gig/service-book.jpg';
const whispererBookImg = '/images/gig/whisperer-book.jpg';
const driverBecomeImg = '/images/gig/driver-become.jpg';
const servicesBecomeImg = '/images/gig/services-become.jpg';
const whispererBecomeImg = '/images/gig/whisperer-become.jpg';
const farmerImg = '/images/providers/farmer.jpg';
const homesteaderImg = '/images/providers/homesteader.jpg';
const manufacturerImg = '/images/providers/manufacturer.jpg';
const connectFarmerImg = '/images/providers/connect-farmer.jpg';
const connectHomesteaderImg = '/images/providers/connect-homesteader.jpg';
const connectManufacturerImg = '/images/providers/connect-manufacturer.jpg';

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
    { key: 'ride', icon: Car, label: 'The Wandering Wheel', desc: 'Book a driver', img: rideBookImg, video: '/videos/banners/wandering-wheel-book.mp4', onClick: () => openBooking('ride') },
    { key: 'service', icon: Wrench, label: 'The Wandering Hand', desc: 'Tribal skills', img: serviceBookImg, video: '/videos/banners/wandering-hand-book.mp4', onClick: () => openBooking('service') },
    { key: 'whisperer', icon: Ear, label: 'The Wandering Whisper', desc: 'Marketing help', img: whispererBookImg, video: '/videos/banners/wandering-whisperer-book.mp4', onClick: () => openBooking('whisperer') },
    { key: 'stays', icon: BedDouble, label: 'The Wondering Pillow', desc: 'Holiday & stays', img: '/images/gig/stays-book.jpg', video: '/videos/banners/wandering-pillow-book.mp4', onClick: () => navigate('/stays') },
  ];

  const connectCards = [
    { key: 'farmer', emoji: '🌾', label: 'The Wandering Field', desc: 'Fresh produce', img: connectFarmerImg, video: '/videos/banners/wandering-field-book.mp4', href: '/providers?type=farmer' },
    { key: 'homesteader', emoji: '🏡', label: 'The Wandering Hearth', desc: 'Handmade goods', img: connectHomesteaderImg, video: '/videos/banners/wandering-hearth-book.mp4', href: '/providers?type=homesteader' },
    { key: 'manufacturer', emoji: '🏭', label: 'The Wandering Forge', desc: 'Produce at scale', img: connectManufacturerImg, video: '/videos/banners/wandering-forge-book.mp4', href: '/providers?type=manufacturer' },
  ];

  const becomeCards = [
    { icon: Car, label: 'Become a Wandering Wheel Provider', desc: 'Register vehicle', img: driverBecomeImg, href: '/register-vehicle', video: '/videos/banners/wandering-wheel.mp4' },
    { icon: Wrench, label: 'Become a Wandering Hand Provider', desc: 'Offer your skills', img: servicesBecomeImg, href: '/register-services', video: '/videos/banners/wandering-hand-become.mp4' },
    { icon: Ear, label: 'Become a Wondering Whisperer Provider', desc: 'Content & marketing', img: whispererBecomeImg, href: '/become-whisperer', video: '/videos/banners/wandering-whisperer.mp4' },
    { icon: BedDouble, label: 'Become a Wandering Pillow Provider', desc: 'List your property', img: '/images/gig/stays-become.jpg', href: '/list-your-stay', video: '/videos/banners/wandering-pillow.mp4' },
    { emoji: '🌾', label: 'Become a Wandering Field Provider', desc: 'Grow & sell', img: farmerImg, href: '/register-provider?type=farmer', video: '/videos/banners/wandering-field.mp4' },
    { emoji: '🏡', label: 'Become a Wandering Hearth Provider', desc: 'Handmade goods', img: homesteaderImg, href: '/register-provider?type=homesteader', video: '/videos/banners/wandering-hearth.mp4' },
    { emoji: '🏭', label: 'Become a Wandering Forge Provider', desc: 'Produce at scale', img: manufacturerImg, href: '/register-provider?type=manufacturer', video: '/videos/banners/wandering-forge.mp4' },
  ];

  const [playingBanner, setPlayingBanner] = useState<string | null>(null);
  const [playingBook, setPlayingBook] = useState<string | null>(null);

  const bookCarousel = useCarousel(bookCards.length);
  const connectCarousel = useCarousel(connectCards.length);
  const becomeCarousel = useCarousel(becomeCards.length);

  return (
    <>
      <div className="space-y-3">
        <SectionHeading
          icon={HandHeart}
          title="Services"
          subtitle="Book, connect, or become a provider"
          theme={theme}
          gradientColors={['#14b8a6', '#06b6d4']}
        />

        {/* Book a Service Carousel */}
        <div>
          <div className="mb-2">
            <SubSectionLabel emoji="📅" label="Book a S2G Wandering Service" gradientColors={['#0d9488', '#06b6d4']} />
          </div>
          <div className="relative">
            <div
              ref={bookCarousel.scrollRef}
              onScroll={bookCarousel.handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <style>{`.book-carousel::-webkit-scrollbar { display: none; }`}</style>
              {bookCards.map((card) => {
                const cardVideo = 'video' in card ? (card.video as string | undefined) : undefined;
                const isPlaying = playingBook === card.key;
                return (
                  <div
                    key={card.key}
                    className="min-w-full flex-shrink-0 snap-center block rounded-2xl overflow-hidden shadow-md relative h-[260px]"
                  >
                    {isPlaying && cardVideo ? (
                      <>
                        <video
                          src={cardVideo}
                          autoPlay
                          controls
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover bg-black"
                        />
                        <button
                          onClick={() => setPlayingBook(null)}
                          className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
                          aria-label="Close video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {cardVideo ? (
                          <CarouselBannerVideo src={cardVideo} fallbackImg={card.img} alt={card.label} />
                        ) : (
                          <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                        <div className="relative h-full flex flex-col justify-end p-4">

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-white text-lg leading-tight">{card.label}</h3>
                              <p className="text-xs text-white/80">{card.desc}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPlayingBook(card.key)}
                                disabled={!cardVideo}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 disabled:opacity-40 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)' }}
                              >
                                <Play className="w-4 h-4 mr-1.5 fill-current" />
                                Play
                              </button>
                              <button
                                type="button"
                                onClick={card.onClick}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #22d3ee 100%)' }}
                              >
                                <Calendar className="w-4 h-4 mr-1.5" />
                                Book
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
          <div className="mb-2">
            <SubSectionLabel emoji="🌿" label="Connect with a S2G Wandering Provider" gradientColors={['#059669', '#10b981']} />
          </div>
          <div className="relative">
            <div
              ref={connectCarousel.scrollRef}
              onScroll={connectCarousel.handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {connectCards.map((card) => {
                const cardVideo = 'video' in card ? (card.video as string | undefined) : undefined;
                const isPlaying = playingBook === `connect-${card.key}`;
                return (
                  <div
                    key={card.key}
                    className="min-w-full flex-shrink-0 snap-center block rounded-2xl overflow-hidden shadow-md relative h-[260px]"
                  >
                    {isPlaying && cardVideo ? (
                      <>
                        <video
                          src={cardVideo}
                          autoPlay
                          controls
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover bg-black"
                        />
                        <button
                          onClick={() => setPlayingBook(null)}
                          className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
                          aria-label="Close video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {cardVideo ? (
                          <CarouselBannerVideo src={cardVideo} fallbackImg={card.img} alt={card.label} />
                        ) : (
                          <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                        <div className="relative h-full flex flex-col justify-end p-4">

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-white text-lg leading-tight">{card.label}</h3>
                              <p className="text-xs text-white/80">{card.desc}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPlayingBook(`connect-${card.key}`)}
                                disabled={!cardVideo}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 disabled:opacity-40 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #047857 0%, #15803d 100%)' }}
                              >
                                <Play className="w-4 h-4 mr-1.5 fill-current" />
                                Play
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(card.href)}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #34d399 0%, #4ade80 100%)' }}
                              >
                                <UserPlus className="w-4 h-4 mr-1.5" />
                                Connect
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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

        {/* Become a Provider Carousel */}
        <div>
          <div className="mb-2">
            <SubSectionLabel emoji="🌱" label="Become a S2G Wandering Provider" gradientColors={['#7c3aed', '#a855f7']} />
          </div>
          <div className="relative">
            <div
              ref={becomeCarousel.scrollRef}
              onScroll={becomeCarousel.handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {becomeCards.map((card) => {
                const isPlaying = playingBanner === card.label;
                return (
                  <div
                    key={card.label + '-become'}
                    className="min-w-full flex-shrink-0 snap-center block rounded-2xl overflow-hidden shadow-md relative h-[260px]"
                  >
                    {isPlaying && card.video ? (
                      <>
                        <video
                          src={card.video}
                          autoPlay
                          controls
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover bg-black"
                        />
                        <button
                          onClick={() => setPlayingBanner(null)}
                          className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
                          aria-label="Close video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {card.video ? (
                          <CarouselBannerVideo src={card.video} fallbackImg={card.img} alt={card.label} />
                        ) : (
                          <img src={card.img} alt={card.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                        <div className="relative h-full flex flex-col justify-end p-4">

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-white text-lg leading-tight">{card.label}</h3>
                              <p className="text-xs text-white/80">{card.desc}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPlayingBanner(card.label)}
                                disabled={!card.video}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 disabled:opacity-40 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)' }}
                              >
                                <Play className="w-4 h-4 mr-1.5 fill-current" />
                                Play
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(card.href)}
                                className="flex-1 h-9 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)' }}
                              >
                                <UserPlus className="w-4 h-4 mr-1.5" />
                                Register
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => becomeCarousel.scrollTo(becomeCarousel.index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => becomeCarousel.scrollTo(becomeCarousel.index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center shadow-md"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
              {becomeCarousel.index + 1}/{becomeCards.length}
            </div>
          </div>
        </div>

        {/* Buttons & Escrow */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/register-provider')}
            className="w-full h-12 inline-flex items-center justify-center rounded-2xl text-base font-semibold text-white border-0 shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
          >
            <Sprout className="w-5 h-5 mr-2" />
            Register as Provider
          </button>
          <button
            type="button"
            onClick={() => navigate('/providers')}
            className="w-full h-11 inline-flex items-center justify-center rounded-2xl text-sm font-semibold text-white border-0 shadow-md hover:shadow-lg hover:brightness-110 transition-all"
            style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)' }}
          >
            Browse All Providers
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
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