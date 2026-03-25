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
}

export const GradientGatewayCard: React.FC<GradientGatewayCardProps> = ({
  href, title, subtitle, icon: Icon, gradient, badge, className = '',
}) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Link
      to={href}
      className={`block rounded-2xl p-5 transition-all shadow-lg relative overflow-hidden ${className}`}
      style={{ background: gradient }}
    >
      {badge !== undefined && (
        <span className="absolute top-3 right-3 bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-bold text-white text-sm">{title}</h3>
      <p className="text-[11px] text-white/70 mt-0.5">{subtitle}</p>
    </Link>
  </motion.div>
);
