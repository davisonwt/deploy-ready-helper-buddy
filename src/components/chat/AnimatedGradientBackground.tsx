import { useEffect, useState } from 'react';

export function AnimatedGradientBackground() {
  const [hue, setHue] = useState(220);

  useEffect(() => {
    const interval = setInterval(() => {
      setHue((prev) => (prev + 1) % 360);
    }, 500); // Shift hue every 0.5s for smooth transition

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, 
          hsl(${hue}, 70%, 10%) 0%, 
          hsl(${(hue + 30) % 360}, 60%, 8%) 50%, 
          hsl(${(hue + 60) % 360}, 70%, 6%) 100%)`,
      }}
    />
  );
}
