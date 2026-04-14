import React from 'react';
import { Palette, Video, Users, FileText, MessageCircle, Award } from 'lucide-react';

const benefits = [
  {
    icon: Palette,
    title: 'Branded Ambassador Arsenal',
    desc: 'One-tap generation of logos, banners, profile frames, video intros, story templates & reels — auto-optimized for every platform.',
    color: '#0d9488',
  },
  {
    icon: Video,
    title: 'Viral Forge Agent',
    desc: 'Your personal AI that creates, edits, voiceovers, and auto-pushes viral content across ALL your social accounts on autopilot.',
    color: '#14b8a6',
  },
  {
    icon: Users,
    title: 'Growth Legion Agents',
    desc: 'A squad of specialized agents — Brand Amplifier, Content Conqueror, Analytics Oracle — running 24/7 campaigns tailored to your niche.',
    color: '#f59e0b',
  },
  {
    icon: FileText,
    title: 'Brochure & Offer Empire',
    desc: 'Agents that build full sales funnels, brochures, lead magnets, and landing pages in seconds.',
    color: '#fbbf24',
  },
  {
    icon: MessageCircle,
    title: 'Tribe Network',
    desc: 'Private ambassador-only channel where agents moderate, share winning strategies, and run group campaigns.',
    color: '#0d9488',
  },
  {
    icon: Award,
    title: 'Legacy Builder',
    desc: 'Monthly "Featured Ambassador" spotlight giving you massive exposure inside S2G and to the entire tribe.',
    color: '#f59e0b',
  },
];

export const AmbassadorValueStack: React.FC = () => {
  return (
    <section id="ambassador-value-stack" className="py-20 px-6" style={{ background: '#0a0a0f' }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
          <span className="bg-gradient-to-r from-teal-400 to-amber-400 bg-clip-text text-transparent">
            Your AI Empire Toolkit
          </span>
        </h2>
        <p className="text-center text-white/50 mb-12 max-w-lg mx-auto">
          Six superpower agents working for you around the clock. Each one designed to 10x a different part of your business.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `${b.color}20`,
                    boxShadow: `0 0 20px ${b.color}30`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: b.color }} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{b.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{b.desc}</p>
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: `0 0 30px ${b.color}15` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
