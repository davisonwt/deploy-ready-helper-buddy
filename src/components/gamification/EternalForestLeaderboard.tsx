import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { launchConfetti, launchSparkles, floatingScore } from '@/utils/confetti';

// Define playSoundEffect locally if it doesn't exist in confetti utils
const playSoundEffect = (sound: string, volume?: number) => {
  try {
    // Simple audio play implementation
    const audio = new Audio(`/sounds/${sound}.mp3`);
    audio.volume = volume || 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    // Silently fail if sound doesn't exist
  }
};

interface UserTree {
  id: string;
  name: string;
  level: number;
  xp: number;
  x: number;
  y: number;
  targetY: number;
}

interface EternalForestLeaderboardProps {
  className?: string;
}

export function EternalForestLeaderboard({ className = '' }: EternalForestLeaderboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [users, setUsers] = useState<UserTree[]>([]);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const usersRef = useRef<UserTree[]>([]);

  // Load forest data
  useEffect(() => {
    loadForest();
    
    // Set up real-time subscription - use type assertion for table not in generated types
    const channel = supabase
      .channel('forest')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles', // Use profiles instead since user_progress may not exist
        },
        (payload: any) => {
          const updated = usersRef.current.find((u) => u.id === payload.new?.user_id);
          if (updated && payload.new) {
            const oldLevel = updated.level;
            updated.xp = payload.new.xp || 0;
            updated.level = payload.new.level || Math.floor(Math.sqrt((payload.new.xp || 0) / 100));
            
            // TREE BURST EFFECT
            if (updated.level > oldLevel) {
              launchConfetti();
              playSoundEffect('treeGrow', 0.6);
              playSoundEffect('levelUp', 0.9);
              floatingScore(updated.x, updated.y - 200);
            } else {
              playSoundEffect('treeGrow', 0.4);
              floatingScore(updated.x, updated.y - 200);
            }
            
            // Update state to trigger re-render
            setUsers([...usersRef.current]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const loadForest = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load top 500 users from profiles table with xp/level fields
      // Use type assertion since these columns may not be in generated types
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('user_id, display_name, xp, level')
        .order('xp', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error loading forest:', error);
        return;
      }

      // Also get current user if not in top 500
      let currentUserData = null;
      if (user) {
        const { data: currentUser } = await (supabase
          .from('profiles') as any)
          .select('user_id, display_name, xp, level')
          .eq('user_id', user.id)
          .single();

        if (currentUser && !data?.some((u: any) => u.user_id === user.id)) {
          currentUserData = currentUser;
        }
      }

      const allUsers = currentUserData ? [...(data || []), currentUserData] : (data || []);

      const forestUsers: UserTree[] = allUsers.map((u: any, i: number) => ({
        id: u.user_id || `user-${i}`,
        name: u.display_name || `Sower #${i + 1}`,
        level: u.level || 1,
        xp: u.xp || 0,
        x: (i % 50) * 300 + Math.random() * 100,
        y: Math.floor(i / 50) * 400 + Math.random() * 200,
        targetY: 0,
      }));

      usersRef.current = forestUsers;
      setUsers(forestUsers);
      
      // Initialize camera
      if (canvasRef.current) {
        setCamera({ x: 0, y: canvasRef.current.height / 2, zoom: 1 });
      }
    } catch (error) {
      console.error('Error loading forest:', error);
    }
  };

  // Drawing functions
  const drawTree = (ctx: CanvasRenderingContext2D, user: UserTree) => {
    const height = 80 + user.level * 18;
    const width = 40 + user.level * 6;
    const brightness = Math.min(user.level / 30, 1);

    // Trunk
    ctx.fillStyle = `rgba(${139 + brightness * 100}, ${69 + brightness * 80}, 19, 1)`;
    ctx.fillRect(user.x - width / 4, user.y - height, width / 2, height);

    // Canopy
    ctx.fillStyle = `hsla(${110 + brightness * 40}, 80%, ${40 + brightness * 30}%, 0.9)`;
    ctx.beginPath();
    ctx.arc(user.x, user.y - height - 30, width * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Golden glow for top 10 (high level users)
    if (user.level > 40) {
      ctx.shadowBlur = 80;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(user.x, user.y - height - 30, width * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Name + level
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${user.name} • L${user.level}`, user.x, user.y + 20);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || users.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply camera transform
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Gentle floating animation
      usersRef.current.forEach((u) => {
        u.y += Math.sin(Date.now() * 0.001 + u.x) * 0.3;
      });

      // Draw all trees
      usersRef.current.forEach((user) => drawTree(ctx, user));

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [users, camera]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse/touch controls
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging) {
      const deltaX = e.clientX - lastMousePos.x;
      setCamera((prev) => ({ ...prev, x: prev.x - deltaX * 2 }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-slate-900 ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      />
      
      <div className="fixed top-8 left-8 z-10 text-white pointer-events-none">
        <h1 className="text-6xl font-black bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
          Eternal Forest
        </h1>
        <p className="text-2xl opacity-80">Every soul is a tree. Watch the garden grow.</p>
        <p className="text-sm opacity-60 mt-2">
          Drag to explore • {users.length} trees growing
        </p>
      </div>
    </div>
  );
}

