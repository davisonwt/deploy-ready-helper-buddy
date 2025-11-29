// Super lightweight confetti – no external library needed
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

  const confetti: Array<{
    x: number;
    y: number;
    r: number;
    d: number;
    color: string;
    tilt: number;
    tiltAngleIncrement: number;
    tiltAngle: number;
  }> = [];
  const colors = ['#facc15', '#34d399', '#c084fc', '#f43f5e', '#22d3ee', '#fbbf24'];

  for (let i = 0; i < 300; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  let animationFrame: number;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confetti.forEach((c, i) => {
      c.tiltAngle += c.tiltAngleIncrement;
      c.y += c.d;
      c.tilt = Math.sin(c.tiltAngle) * 15;

      if (c.y > canvas.height) {
        confetti.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.lineWidth = c.r;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r / 2, c.y);
        ctx.lineTo(c.x + c.tilt - c.r / 2, c.y + c.r + 5);
        ctx.stroke();
      }
    });

    if (confetti.length > 0) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();
}

// Make it available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).launchConfetti = launchConfetti;
}

