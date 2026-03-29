import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface GradientGatewayCardProps {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  badge?: string | number;
  className?: string;
  backgroundImage?: string;
}

export const GradientGatewayCard: React.FC<GradientGatewayCardProps> = ({
  href, title, subtitle, icon: Icon, gradient, badge, className = '', backgroundImage,
}) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Link
      to={href}
      className={`block rounded-2xl transition-all shadow-lg relative overflow-hidden ${backgroundImage ? 'h-[100px]' : 'p-5'} ${className}`}
      style={backgroundImage ? undefined : { background: gradient }}
    >
      {backgroundImage && (
        <>
          <img src={backgroundImage} alt={title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
        </>
      )}
      {badge !== undefined && (
        <span className="absolute top-3 right-3 bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          {badge}
        </span>
      )}
      {backgroundImage ? (
        <div className="relative h-full flex flex-col justify-between p-3">
          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs">{title}</h3>
            <p className="text-[9px] text-white/80 mt-0.5">{subtitle}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-[11px] text-white/70 mt-0.5">{subtitle}</p>
        </>
      )}
    </Link>
  </motion.div>
);
