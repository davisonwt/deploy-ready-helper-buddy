import { useMemo } from 'react';
import { Package, Music, Book, GraduationCap, Image, FileText, Video, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';

interface GradientPlaceholderProps {
  type?: 'product' | 'music' | 'ebook' | 'document' | 'training_course' | 'art_asset' | 'orchard' | 'video' | 'default';
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Color schemes matching the new aesthetic
const colorSchemes = [
  { from: 'from-purple-500', via: 'via-pink-500', to: 'to-blue-500' }, // Purple/Pink/Blue
  { from: 'from-blue-500', via: 'via-cyan-500', to: 'to-teal-500' }, // Blue/Cyan/Teal
  { from: 'from-pink-500', via: 'via-rose-500', to: 'to-orange-500' }, // Pink/Rose/Orange
  { from: 'from-green-500', via: 'via-emerald-500', to: 'to-teal-500' }, // Green/Emerald/Teal
  { from: 'from-indigo-500', via: 'via-purple-500', to: 'to-pink-500' }, // Indigo/Purple/Pink
  { from: 'from-cyan-500', via: 'via-blue-500', to: 'to-indigo-500' }, // Cyan/Blue/Indigo
];

const typeColors: Record<string, typeof colorSchemes[number]> = {
  music: { from: 'from-purple-500', via: 'via-pink-500', to: 'to-blue-500' },
  ebook: { from: 'from-blue-500', via: 'via-indigo-500', to: 'to-purple-500' },
  document: { from: 'from-gray-500', via: 'via-slate-500', to: 'to-zinc-500' },
  training_course: { from: 'from-orange-500', via: 'via-amber-500', to: 'to-yellow-500' },
  art_asset: { from: 'from-pink-500', via: 'via-rose-500', to: 'to-red-500' },
  orchard: { from: 'from-green-500', via: 'via-emerald-500', to: 'to-teal-500' },
  video: { from: 'from-red-500', via: 'via-pink-500', to: 'to-purple-500' },
  product: { from: 'from-blue-500', via: 'via-cyan-500', to: 'to-teal-500' },
  default: { from: 'from-indigo-500', via: 'via-purple-500', to: 'to-pink-500' },
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music,
  ebook: Book,
  document: FileText,
  training_course: GraduationCap,
  art_asset: Image,
  orchard: Sprout,
  video: Video,
  product: Package,
  default: Package,
};

export function GradientPlaceholder({ type = 'default', title, className = '', size = 'md' }: GradientPlaceholderProps) {
  // Get color scheme based on type or hash of title
  const colorScheme = useMemo(() => {
    if (typeColors[type]) {
      return typeColors[type];
    }
    // Hash title to get consistent color for same title
    if (title) {
      const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colorSchemes[hash % colorSchemes.length];
    }
    return colorSchemes[0];
  }, [type, title]);

  const Icon = typeIcons[type] || typeIcons.default;
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colorScheme.from} ${colorScheme.via} ${colorScheme.to} opacity-90`}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative flex items-center justify-center h-full">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`${sizeClasses[size]} text-white flex items-center justify-center`}
        >
          <Icon className="w-1/2 h-1/2" />
        </motion.div>
      </div>
    </div>
  );
}

