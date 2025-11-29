// Ultimate Particle Candy - Enhanced confetti system

// 1. Reusable confetti (upgraded version)
export function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces: Array<{
    x: number;
    y: number;
    r: number;
    d: number;
    color: string;
    tilt: number;
    tiltAngle: number;
    tiltIncrement: number;
  }> = [];
  const colors = ['#facc15', '#34d399', '#c084fc', '#f43f5e', '#22d3ee', '#fbbf24', '#f472b6'];

  for (let i = 0; i < 350; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20,
      r: Math.random() * 8 + 3,
      d: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltIncrement: Math.random() * 0.1 + 0.04
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p, i) => {
      p.tiltAngle += p.tiltIncrement;
      p.y += p.d;
      p.tilt = Math.sin(p.tiltAngle) * 15;

      if (p.y > canvas.height) {
        pieces.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt - p.r / 2, p.y + p.r + 8);
        ctx.stroke();
      }
    });

    if (pieces.length) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();
}

// 2. Sparkle burst (perfect for Mystery Seed & Surprise Me)
export function launchSparkles(x?: number, y?: number) {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const centerX = x ?? window.innerWidth / 2;
  const centerY = y ?? window.innerHeight / 2;

  const sparkles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    color: string;
  }> = [];

  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 8 + 4;
    sparkles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: Math.random() * 6 + 3,
      life: 60,
      color: ['#fbbf24', '#facc15', '#f472b6', '#c084fc'][Math.floor(Math.random() * 4)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sparkles.forEach((s, i) => {
      s.life--;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.2; // gravity

      if (s.life <= 0 || s.y > canvas.height) {
        sparkles.splice(i, 1);
      } else {
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
    });

    if (sparkles.length) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
      ctx.shadowBlur = 0;
    }
  }
  draw();
}

// 3. Floating garden particles (leaves, petals, tiny fruits) — runs forever
export function startGardenParticles() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1'; // behind everything
  canvas.style.opacity = '0.4';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    sway: number;
    swayPhase: number;
    type: string;
  }> = [];

  const symbols = ['Leaf', 'Petal', 'Tiny Fruit', 'Tiny Fruit', 'Petal', 'Sparkles', 'Sparkles'];

  const intervalId = setInterval(() => {
    if (particles.length < 40) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -50,
        size: Math.random() * 20 + 15,
        speed: Math.random() * 1.5 + 0.8,
        sway: Math.random() * 4 + 2,
        swayPhase: Math.random() * Math.PI * 2,
        type: symbols[Math.floor(Math.random() * symbols.length)]
      });
    }
  }, 800);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.y += p.speed;
      p.x += Math.sin(p.y * 0.02 + p.swayPhase) * p.sway;

      if (p.y > canvas.height + 50) {
        particles.splice(i, 1);
      } else {
        ctx.font = `${p.size}px serif`;
        ctx.fillStyle = p.type === 'Tiny Fruit' ? '#f43f5e' : p.type === 'Leaf' ? '#34d399' : '#f472b6';
        const text = p.type === 'Sparkles' ? '✨' : p.type === 'Tiny Fruit' ? '🍒' : '🍃';
        ctx.fillText(text, p.x, p.y);
      }
    });
    requestAnimationFrame(draw);
  }
  draw();

  const handleResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);

  // Cleanup function (optional, for when component unmounts)
  return () => {
    clearInterval(intervalId);
    window.removeEventListener('resize', handleResize);
    canvas.remove();
  };
}

// 4. Floating score numbers (+1, +5, +10 etc.)
export function floatingScore(amount: number = 1, x?: number, y?: number) {
  const score = document.createElement('div');
  score.textContent = `+${amount} USDC`;
  score.style.position = 'fixed';
  score.style.left = (x ?? window.innerWidth / 2) + 'px';
  score.style.top = (y ?? window.innerHeight / 2) + 'px';
  score.style.transform = 'translate(-50%, -50%)';
  score.style.fontSize = amount > 5 ? '3.5rem' : '2.8rem';
  score.style.fontWeight = '900';
  score.style.color = amount > 10 ? '#f43f5e' : amount > 5 ? '#facc15' : '#34d399';
  score.style.pointerEvents = 'none';
  score.style.zIndex = '99999';
  score.style.textShadow = '0 0 20px rgba(0,0,0,0.8), 0 0 40px currentColor';
  score.style.opacity = '0';
  score.style.transition = 'all 1.4s cubic-bezier(0.22,1,0.36,1)';
  document.body.appendChild(score);

  // Animate in → up → fade
  requestAnimationFrame(() => {
    score.style.opacity = '1';
    score.style.transform = `translate(-50%, -${200 + amount * 10}px) scale(${1 + amount * 0.1})`;
  });

  setTimeout(() => score.remove(), 1600);
}

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).launchConfetti = launchConfetti;
  (window as any).launchSparkles = launchSparkles;
  (window as any).startGardenParticles = startGardenParticles;
  (window as any).floatingScore = floatingScore;
}
