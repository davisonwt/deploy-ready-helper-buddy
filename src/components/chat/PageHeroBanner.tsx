import banner1on1 from '@/assets/chat-mode-1on1.jpg';
import bannerCommunity from '@/assets/chat-mode-community.jpg';
import bannerClassroom from '@/assets/chat-mode-classroom.jpg';
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

const MAP: Record<HeroVariant, { src: string; title: string; subtitle: string }> = {
  one_on_one: { src: banner1on1, title: '1-on-1 Live', subtitle: 'Private rooms for intimate face-to-face conversations' },
  community: { src: bannerCommunity, title: 'Community Chats', subtitle: 'Open rooms to gather, share, and connect' },
  classroom: { src: bannerClassroom, title: 'Classroom', subtitle: 'Structured learning sessions with instructors' },
  skilldrop: { src: bannerLecture, title: 'SkillDrop', subtitle: 'Short lectures and skill-sharing drops' },
  training: { src: bannerTraining, title: 'Training', subtitle: 'Premium rooms, courses, and guided programs' },
  radio: { src: bannerRadio, title: 'Radio', subtitle: 'Live broadcasts, playlists, and audio shows' },
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
    <div className={`relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-5 ${className}`}>
      <img
        src={b.src}
        alt={`${b.title} banner`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-black drop-shadow-lg">
          {title ?? b.title}
        </h2>
        <p className="text-white/85 text-xs md:text-sm mt-1 max-w-2xl drop-shadow">
          {subtitle ?? b.subtitle}
        </p>
      </div>
    </div>
  );
}
