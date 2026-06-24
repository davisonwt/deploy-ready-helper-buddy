import banner1on1 from '@/assets/chat-mode-1on1-realistic.jpg';
import bannerCommunity from '@/assets/chat-mode-community-realistic.jpg';
import bannerClassroom from '@/assets/chat-mode-classroom-realistic.jpg';
import bannerSkilldrop from '@/assets/chat-mode-skilldrop.jpg';
import bannerTraining from '@/assets/chat-mode-training-rooms.jpg';
import bannerRadio from '@/assets/chat-mode-radio.jpg';

export type HeroVariant =
  | 'one_on_one'
  | 'community'
  | 'classroom'
  | 'skilldrop'
  | 'training'
  | 'radio';

const MAP: Record<HeroVariant, { src: string; title: string; subtitle: string; rgb: string; ring: string }> = {
  // Colors match the CommunicationsHub button accents
  one_on_one: { src: banner1on1, title: '1-on-1 Live', subtitle: 'Private rooms for intimate face-to-face conversations', rgb: '34,211,238', ring: 'rgba(34,211,238,0.45)' }, // cyan
  community: { src: bannerCommunity, title: 'Community Chats', subtitle: 'Open rooms to gather, share, and connect', rgb: '16,185,129', ring: 'rgba(16,185,129,0.45)' }, // emerald
  classroom: { src: bannerClassroom, title: 'Classroom', subtitle: 'Structured learning sessions with instructors', rgb: '139,92,246', ring: 'rgba(139,92,246,0.45)' }, // violet
  skilldrop: { src: bannerSkilldrop, title: 'SkillDrop', subtitle: 'Teach what you love — cooking, painting, fixing, crafting', rgb: '245,158,11', ring: 'rgba(245,158,11,0.45)' }, // amber
  training: { src: bannerTraining, title: 'Training', subtitle: 'Premium rooms, courses, and guided programs', rgb: '244,114,182', ring: 'rgba(244,114,182,0.45)' }, // rose
  radio: { src: bannerRadio, title: 'Radio', subtitle: 'Live broadcasts, playlists, and audio shows', rgb: '56,189,248', ring: 'rgba(56,189,248,0.45)' }, // sky
};

interface Props {
  variant: HeroVariant;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function PageHeroBanner({ variant, title, subtitle, className = '' }: Props) {
  const b = MAP[variant];
  return (
    <>
      {/* Page-wide themed backdrop tint matching the launch button color */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at 15% 15%, rgba(${b.rgb},0.22), transparent 55%), radial-gradient(circle at 85% 85%, rgba(${b.rgb},0.18), transparent 60%)`,
        }}
      />
      <div
        className={`relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-5 border z-10 ${className}`}
        style={{ borderColor: b.ring, boxShadow: `0 0 40px rgba(${b.rgb},0.25)` }}
      >
        <img
          src={b.src}
          alt={`${b.title} banner`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, rgba(0,0,0,0.85), rgba(${b.rgb},0.25) 60%, rgba(0,0,0,0.1))` }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
          <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-black drop-shadow-lg">
            {title ?? b.title}
          </h2>
          <p className="text-white/85 text-xs md:text-sm mt-1 max-w-2xl drop-shadow">
            {subtitle ?? b.subtitle}
          </p>
        </div>
      </div>
    </>
  );
}
