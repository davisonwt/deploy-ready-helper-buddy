import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const AuroraBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        
        // Teal/cyan colors
        const colors = [
          'rgba(23, 162, 184, 0.6)',   // --primary teal
          'rgba(77, 208, 225, 0.5)',   // light teal
          'rgba(0, 217, 255, 0.4)',    // cyan
          'rgba(30, 58, 92, 0.7)'      // card blue
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const particleCount = 80;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby particles
      particles.forEach((particle, i) => {
        particle.update();
        particle.draw();

        // Draw lines to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particle.x;
          const dy = particles[j].y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.strokeStyle = `rgba(23, 162, 184, ${0.15 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Fixed background layer behind everything */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'linear-gradient(135deg, hsl(210, 67%, 12%) 0%, hsl(212, 49%, 24%) 25%, hsl(188, 78%, 41%) 50%, hsl(199, 89%, 50%) 75%, hsl(212, 49%, 24%) 100%)',
              'linear-gradient(135deg, hsl(212, 49%, 24%) 0%, hsl(188, 78%, 41%) 25%, hsl(199, 89%, 50%) 50%, hsl(212, 49%, 24%) 75%, hsl(210, 67%, 12%) 100%)',
              'linear-gradient(135deg, hsl(210, 67%, 12%) 0%, hsl(212, 49%, 24%) 25%, hsl(188, 78%, 41%) 50%, hsl(199, 89%, 50%) 75%, hsl(212, 49%, 24%) 100%)',
            ],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 opacity-60"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
      
      {/* Content layer above background */}
      <div className="relative">
        {children}
      </div>
    </>
  );
};
