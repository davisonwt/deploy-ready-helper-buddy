import { UserTree, TreeBounds, ForestConfig } from './types';

// Draw the gradient sky and ground
export function drawEnvironment(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Sky gradient (dark blue to soft green-blue)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGradient.addColorStop(0, '#0c1445');
  skyGradient.addColorStop(0.5, '#1a3a5c');
  skyGradient.addColorStop(1, '#2d5a4a');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.6);
  
  // Ground gradient (forest greens to earthy brown)
  const groundGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
  groundGradient.addColorStop(0, '#1e4d2b');
  groundGradient.addColorStop(0.3, '#2d5a34');
  groundGradient.addColorStop(0.7, '#3d4a2a');
  groundGradient.addColorStop(1, '#2a3520');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);
  
  // Subtle grass texture hints
  ctx.fillStyle = 'rgba(60, 100, 50, 0.3)';
  for (let i = 0; i < 100; i++) {
    const gx = Math.random() * width;
    const gy = height * 0.55 + Math.random() * height * 0.4;
    ctx.fillRect(gx, gy, 2, 8 + Math.random() * 6);
  }
}

// Draw floating clouds
export function drawClouds(ctx: CanvasRenderingContext2D, width: number, time: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  
  for (let i = 0; i < 5; i++) {
    const baseX = ((time * 0.01 * (i + 1)) % (width + 400)) - 200;
    const y = 50 + i * 60;
    const size = 60 + i * 20;
    
    ctx.beginPath();
    ctx.arc(baseX, y, size, 0, Math.PI * 2);
    ctx.arc(baseX + size * 0.7, y - 10, size * 0.8, 0, Math.PI * 2);
    ctx.arc(baseX + size * 1.3, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the central World Tree
export function drawWorldTree(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const height = 350;
  const width = 120;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 30, width * 2, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Trunk with wood texture
  const trunkGradient = ctx.createLinearGradient(x - width/3, y, x + width/3, y);
  trunkGradient.addColorStop(0, '#3d2817');
  trunkGradient.addColorStop(0.5, '#5c3d24');
  trunkGradient.addColorStop(1, '#3d2817');
  ctx.fillStyle = trunkGradient;
  ctx.fillRect(x - width/3, y - height, width * 0.67, height);
  
  // Multi-layered canopy (3 layers)
  const canopyColors = ['#1a5c2a', '#2d7a3d', '#3d9a4d'];
  const glowTime = Math.sin(time * 0.002) * 0.3 + 0.7;
  
  for (let i = 2; i >= 0; i--) {
    const layerY = y - height - 60 - i * 50;
    const layerSize = width * (2.5 - i * 0.3);
    
    // Golden glow for world tree
    ctx.shadowBlur = 40 * glowTime;
    ctx.shadowColor = '#fbbf24';
    
    ctx.fillStyle = canopyColors[i];
    ctx.beginPath();
    ctx.arc(x, layerY, layerSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.shadowBlur = 0;
  
  // Crown sparkles
  for (let i = 0; i < 8; i++) {
    const sparkleAngle = (time * 0.001 + i * 0.8) % (Math.PI * 2);
    const sparkleRadius = width * 2 + Math.sin(time * 0.003 + i) * 20;
    const sx = x + Math.cos(sparkleAngle) * sparkleRadius;
    const sy = y - height - 100 + Math.sin(sparkleAngle) * sparkleRadius * 0.5;
    
    ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(time * 0.005 + i) * 0.3})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Label
  ctx.font = 'bold 24px system-ui';
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  ctx.fillText('🌳 Community Tree', x, y + 70);
}

// Draw a single user tree
export function drawTree(
  ctx: CanvasRenderingContext2D,
  user: UserTree,
  time: number,
  isTop10: boolean,
  isSelected: boolean
): TreeBounds {
  const baseHeight = 80 + user.level * 15;
  const baseWidth = 35 + user.level * 5;
  const brightness = Math.min(user.level / 30, 1);
  
  // Gentle floating animation
  const floatOffset = Math.sin(time * 0.001 + user.x * 0.01) * 3;
  const drawY = user.y + floatOffset;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(user.x, user.y + 15, baseWidth * 1.2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Trunk gradient
  const trunkGradient = ctx.createLinearGradient(user.x - baseWidth/4, drawY, user.x + baseWidth/4, drawY);
  trunkGradient.addColorStop(0, `rgb(${100 + brightness * 50}, ${50 + brightness * 30}, 19)`);
  trunkGradient.addColorStop(0.5, `rgb(${139 + brightness * 80}, ${69 + brightness * 60}, 25)`);
  trunkGradient.addColorStop(1, `rgb(${100 + brightness * 50}, ${50 + brightness * 30}, 19)`);
  ctx.fillStyle = trunkGradient;
  ctx.fillRect(user.x - baseWidth/4, drawY - baseHeight, baseWidth/2, baseHeight);
  
  // Canopy based on tree style
  const canopyY = drawY - baseHeight - 20;
  const hue = 110 + brightness * 40;
  const lightness = 35 + brightness * 25;
  
  // Golden glow for top 10
  if (isTop10) {
    ctx.shadowBlur = 50;
    ctx.shadowColor = '#fbbf24';
  }
  
  // Selection glow
  if (isSelected || user.isCurrentUser) {
    ctx.shadowBlur = 40;
    ctx.shadowColor = user.isCurrentUser ? '#3b82f6' : '#10b981';
  }
  
  if (user.treeStyle === 'layered') {
    // 3-layer canopy for high level
    for (let i = 2; i >= 0; i--) {
      ctx.fillStyle = `hsl(${hue}, 70%, ${lightness - i * 8}%)`;
      ctx.beginPath();
      ctx.arc(user.x, canopyY - i * 25, baseWidth * (1.8 - i * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (user.treeStyle === 'pointed') {
    // Triangle/pointed canopy for mid level
    ctx.fillStyle = `hsl(${hue}, 75%, ${lightness}%)`;
    ctx.beginPath();
    ctx.moveTo(user.x, canopyY - baseWidth * 2);
    ctx.lineTo(user.x - baseWidth * 1.5, canopyY + baseWidth * 0.5);
    ctx.lineTo(user.x + baseWidth * 1.5, canopyY + baseWidth * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    // Rounded canopy for lower level
    ctx.fillStyle = `hsl(${hue}, 65%, ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(user.x, canopyY, baseWidth * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.shadowBlur = 0;
  
  // Name label
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${user.name}`, user.x, user.y + 35);
  ctx.font = '12px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`L${user.level} • ${user.xp.toLocaleString()} XP`, user.x, user.y + 52);
  
  // Return bounds for click detection
  return {
    id: user.id,
    x: user.x - baseWidth * 1.5,
    y: drawY - baseHeight - baseWidth * 2,
    width: baseWidth * 3,
    height: baseHeight + baseWidth * 2 + 60,
    user,
  };
}

// Draw ambient particles (leaves, sparkles)
export function drawParticles(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Floating leaves
  for (let i = 0; i < 30; i++) {
    const x = ((time * 0.02 + i * 100) % (width + 100)) - 50;
    const y = ((Math.sin(time * 0.001 + i) * 50) + (time * 0.01 + i * 30)) % height;
    const size = 4 + Math.sin(i) * 2;
    const rotation = (time * 0.002 + i) % (Math.PI * 2);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = `hsla(${100 + i * 5}, 60%, 40%, 0.4)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Sparkles in upper area
  for (let i = 0; i < 15; i++) {
    const x = (Math.sin(time * 0.0005 + i * 0.7) * 0.5 + 0.5) * width;
    const y = 50 + Math.sin(time * 0.0008 + i * 1.3) * 100;
    const alpha = Math.sin(time * 0.003 + i) * 0.3 + 0.3;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
