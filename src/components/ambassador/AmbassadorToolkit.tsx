import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Video, Users, FileText, MessageCircle, Award, ArrowRight } from 'lucide-react';

const tools = [
  {
    icon: Palette,
    title: 'Branded Arsenal',
    desc: 'Generate logos, banners, frames & intros fused with your brand + S2G seal.',
    color: '#0d9488',
    link: null,
    status: 'coming_soon' as const,
  },
  {
    icon: Video,
    title: 'Viral Forge Agent',
    desc: 'Create & auto-publish viral content across all platforms.',
    color: '#14b8a6',
    link: null,
    status: 'coming_soon' as const,
  },
  {
    icon: Users,
    title: 'Growth Legion',
    desc: 'Your AI agent squad running 24/7 campaigns.',
    color: '#f59e0b',
    link: null,
    status: 'coming_soon' as const,
  },
  {
    icon: FileText,
    title: 'Brochure Empire',
    desc: 'Sales funnels, lead magnets & landing pages in seconds.',
    color: '#fbbf24',
    link: null,
    status: 'coming_soon' as const,
  },
  {
    icon: MessageCircle,
    title: 'Tribe Network',
    desc: 'Private ambassador-only channel & group campaigns.',
    color: '#0d9488',
    link: '/communications-hub',
    status: 'active' as const,
  },
  {
    icon: Award,
    title: 'Legacy Builder',
    desc: 'Featured Ambassador spotlight & massive exposure.',
    color: '#f59e0b',
    link: null,
    status: 'coming_soon' as const,
  },
];

export const AmbassadorToolkit: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.title}
            onClick={() => t.link && navigate(t.link)}
            disabled={t.status === 'coming_soon'}
            className="group relative rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] disabled:cursor-default"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${t.color}20`, boxShadow: `0 0 20px ${t.color}30` }}
              >
                <Icon className="w-6 h-6" style={{ color: t.color }} />
              </div>
              {t.status === 'coming_soon' ? (
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-white/5 text-white/40">
                  Coming Soon
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
              )}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{t.title}</h3>
            <p className="text-white/50 text-sm">{t.desc}</p>
          </button>
        );
      })}
    </div>
  );
};
