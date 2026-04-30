import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, X, Bookmark, Sparkles } from 'lucide-react';
import { TribalHeart } from './BondingAnimation';

export interface HeartsProfile {
  user_id: string;
  display_first_name: string | null;
  birthdate: string;
  bio: string | null;
  photos: string[];
  interests: string[];
  location_country: string | null;
  location_region: string | null;
  seeking_intent: string;
  compatibility_score?: number;
}

interface ProfileCardProps {
  profile: HeartsProfile;
  onSpark: () => void;
  onPass: () => void;
  onSave: () => void;
  onOpen?: () => void;
}

function ageFrom(birthdate: string): number {
  const d = new Date(birthdate);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onSpark,
  onPass,
  onSave,
  onOpen,
}) => {
  const photo = profile.photos?.[0];
  const age = ageFrom(profile.birthdate);
  const score = profile.compatibility_score ?? 0;

  return (
    <motion.div
      key={profile.user_id}
      className="relative w-full max-w-sm mx-auto select-none"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -40, rotate: -6 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Card */}
      <div
        className="relative rounded-[28px] overflow-hidden cursor-pointer"
        onClick={onOpen}
        style={{
          aspectRatio: '3/4',
          background:
            'linear-gradient(180deg, hsl(20 25% 14%) 0%, hsl(20 30% 8%) 100%)',
          border: '2px solid hsl(25 40% 22%)',
          boxShadow:
            '0 25px 60px -15px hsl(15 80% 25% / 0.5), 0 0 0 1px hsl(38 60% 50% / 0.08)',
        }}
      >
        {/* Tribal pattern border (subtle pulse) */}
        <motion.div
          className="absolute inset-0 rounded-[26px] pointer-events-none"
          style={{
            border: '1px solid hsl(38 70% 55% / 0.25)',
            boxShadow: 'inset 0 0 30px hsl(25 80% 40% / 0.15)',
          }}
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Photo */}
        {photo ? (
          <img
            src={photo}
            alt={profile.display_first_name || 'Tribe member'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'hsl(20 25% 12%)' }}
          >
            <TribalHeart size={80} color="warm" />
          </div>
        )}

        {/* Warm gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, hsl(20 35% 6%) 0%, hsl(20 30% 10% / 0.7) 50%, transparent 100%)',
          }}
        />

        {/* Compatibility ring */}
        {score > 0 && (
          <div className="absolute top-4 right-4">
            <CompatibilityRing score={score} />
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="flex items-baseline gap-2">
            <h3
              className="text-3xl font-serif"
              style={{ color: 'hsl(38 95% 90%)' }}
            >
              {profile.display_first_name || 'Tribe member'}
            </h3>
            <span
              className="text-xl"
              style={{ color: 'hsl(38 50% 75%)' }}
            >
              {age}
            </span>
          </div>

          {(profile.location_region || profile.location_country) && (
            <div
              className="flex items-center gap-1 mt-1 text-sm"
              style={{ color: 'hsl(38 35% 70%)' }}
            >
              <MapPin size={12} />
              {[profile.location_region, profile.location_country]
                .filter(Boolean)
                .join(', ')}
            </div>
          )}

          {profile.bio && (
            <p
              className="mt-3 text-sm italic line-clamp-2 font-serif"
              style={{ color: 'hsl(38 50% 82%)' }}
            >
              "{profile.bio}"
            </p>
          )}

          {profile.interests?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: 'hsl(75 30% 22% / 0.85)',
                    color: 'hsl(75 60% 80%)',
                    border: '1px solid hsl(75 35% 35% / 0.5)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <ActionButton
          label="Pass"
          onClick={onPass}
          color="muted"
          icon={<X size={22} />}
        />
        <SparkButton onClick={onSpark} />
        <ActionButton
          label="Save"
          onClick={onSave}
          color="cream"
          icon={<Bookmark size={20} />}
        />
      </div>
    </motion.div>
  );
};

/* ---------- Sub-components ---------- */

const CompatibilityRing: React.FC<{ score: number }> = ({ score }) => {
  const size = 52;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'hsl(20 30% 10% / 0.85)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(25 30% 25%)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(38 95% 60%)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: c, strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.4, ease: [0.165, 0.84, 0.44, 1] }}
          style={{ filter: 'drop-shadow(0 0 4px hsl(38 95% 60%))' }}
        />
      </svg>
      <span
        className="text-xs font-semibold relative z-10"
        style={{ color: 'hsl(38 95% 80%)' }}
      >
        {score}%
      </span>
    </div>
  );
};

const SparkButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    onClick={onClick}
    aria-label="Send Spark"
    className="relative flex flex-col items-center"
    whileTap={{ scale: 0.92 }}
  >
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 88,
        height: 88,
        background:
          'radial-gradient(circle, hsl(25 100% 60% / 0.55) 0%, transparent 70%)',
        filter: 'blur(8px)',
      }}
      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: 76,
        height: 76,
        background:
          'linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(25 95% 60%) 100%)',
        boxShadow:
          '0 10px 30px hsl(15 80% 40% / 0.6), inset 0 1px 0 hsl(38 90% 80% / 0.4)',
      }}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <TribalHeart size={42} color="warm" />
    </motion.div>
    <span
      className="text-xs mt-2 font-medium"
      style={{ color: 'hsl(38 70% 78%)' }}
    >
      Spark
    </span>
  </motion.button>
);

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  color: 'muted' | 'cream';
  icon: React.ReactNode;
}> = ({ label, onClick, color, icon }) => {
  const styles =
    color === 'muted'
      ? {
          bg: 'hsl(20 15% 22%)',
          border: 'hsl(20 15% 30%)',
          fg: 'hsl(38 20% 70%)',
        }
      : {
          bg: 'hsl(38 30% 85%)',
          border: 'hsl(38 30% 70%)',
          fg: 'hsl(20 30% 25%)',
        };

  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      <div
        className="flex items-center justify-center rounded-full transition-shadow"
        style={{
          width: 56,
          height: 56,
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          color: styles.fg,
          boxShadow: '0 4px 14px hsl(20 30% 5% / 0.4)',
        }}
      >
        {icon}
      </div>
      <span className="text-xs mt-2" style={{ color: 'hsl(38 35% 65%)' }}>
        {label}
      </span>
    </motion.button>
  );
};
