import React from 'react';
import { AmbassadorThumbnail } from '@/components/marketing/AmbassadorThumbnail';
import { BackButton } from '@/components/navigation/BackButton';

export default function AmbassadorThumbnailPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 z-50">
        <BackButton className="text-white hover:text-white/80" />
      </div>
      <div className="w-full max-w-[1920px]">
        <AmbassadorThumbnail />
      </div>
    </div>
  );
}

