import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Compass, ZoomIn, ZoomOut } from 'lucide-react';
import { UserTree, TreeBounds, Camera, ForestConfig } from './eternal-forest/types';
import { calculateForestLayout, getWorldTreePosition } from './eternal-forest/layoutUtils';
import { drawEnvironment, drawClouds, drawWorldTree, drawTree, drawParticles } from './eternal-forest/drawingUtils';
import { TreeProfileCard } from './eternal-forest/TreeProfileCard';
import { ForestLegend } from './eternal-forest/ForestLegend';
import { launchConfetti, floatingScore } from '@/utils/confetti';

interface EternalForestLeaderboardProps {
  className?: string;
}

const FOREST_CONFIG: ForestConfig = {
  centerX: 0,
  centerY: 0,
  ringSpacing: 200,
  baseTreeSpacing: 100,
};

export function EternalForestLeaderboard({ className = '' }: EternalForestLeaderboardProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [users, setUsers] = useState<UserTree[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [selectedTree, setSelectedTree] = useState<UserTree | null>(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const treeBoundsRef = useRef<TreeBounds[]>([]);
  const usersRef = useRef<UserTree[]>([]);

  // Load forest data
  useEffect(() => {
    loadForest();
    
    const channel = supabase
      .channel('forest-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_points' },
        () => {
          loadForest(); // Reload on any changes
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
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, total_points, level')
        .order('total_points', { ascending: false })
        .limit(500);

      if (pointsError) {
        console.error('Error loading user points:', pointsError);
        return;
      }

      const userIds = pointsData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, { name: p.display_name, avatar: p.avatar_url }])
      );

      // Build user list with current user flag
      const rawUsers = (pointsData || []).map((u: any, i: number) => ({
        id: u.user_id || `user-${i}`,
        name: profileMap.get(u.user_id)?.name || `Sower #${i + 1}`,
        level: u.level || 1,
        xp: u.total_points || 0,
        isCurrentUser: u.user_id === user?.id,
        avatarUrl: profileMap.get(u.user_id)?.avatar,
      }));

      // Calculate positions using ring layout
      const forestUsers = calculateForestLayout(rawUsers, FOREST_CONFIG);

      console.log(`🌳 Eternal Forest: Loaded ${forestUsers.length} trees in ring layout`);
      usersRef.current = forestUsers;
      setUsers(forestUsers);

      // Center camera on world tree
      if (canvasRef.current) {
        setCamera({
          x: canvasRef.current.width / 2,
          y: canvasRef.current.height / 2,
          zoom: 0.8,
        });
      }
    } catch (error) {
      console.error('Error loading forest:', error);
    }
  };

  // Find current user's tree and pan to it
  const findMyTree = useCallback(() => {
    const myTree = usersRef.current.find(u => u.isCurrentUser);
    if (myTree && canvasRef.current) {
      setCamera({
        x: canvasRef.current.width / 2 - myTree.x * 1.2,
        y: canvasRef.current.height / 2 - myTree.y * 1.2 + 100,
        zoom: 1.2,
      });
      setSelectedTree(myTree);
      setCardPosition({ x: canvasRef.current.width / 2, y: 100 });
    }
  }, []);

  // Handle canvas click for tree selection
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - camera.x) / camera.zoom;
    const clickY = (e.clientY - rect.top - camera.y) / camera.zoom;

    // Check if click hit any tree
    const clickedTree = treeBoundsRef.current.find(bounds => {
      return (
        clickX >= bounds.x &&
        clickX <= bounds.x + bounds.width &&
        clickY >= bounds.y &&
        clickY <= bounds.y + bounds.height
      );
    });

    if (clickedTree) {
      setSelectedTree(clickedTree.user);
      setCardPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setSelectedTree(null);
    }
  }, [camera, dragging]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;
    const animate = () => {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw environment (static, before camera transform)
      drawEnvironment(ctx, canvas.width, canvas.height);
      drawClouds(ctx, canvas.width, time);
      drawParticles(ctx, canvas.width, canvas.height, time);

      // Apply camera transform for forest elements
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Draw World Tree at center
      const worldTreePos = getWorldTreePosition(FOREST_CONFIG);
      drawWorldTree(ctx, worldTreePos.x, worldTreePos.y, time);

      // Draw all user trees (sorted by Y for proper layering)
      const sortedUsers = [...usersRef.current].sort((a, b) => a.y - b.y);
      const newBounds: TreeBounds[] = [];

      sortedUsers.forEach((user, index) => {
        const isTop10 = index < 10;
        const isSelected = selectedTree?.id === user.id;
        const bounds = drawTree(ctx, user, time, isTop10, isSelected);
        newBounds.push(bounds);
      });

      treeBoundsRef.current = newBounds;

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [camera, selectedTree]);

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
      const deltaY = e.clientY - lastMousePos.y;
      setCamera(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      setSelectedTree(null); // Close card while dragging
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.001;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(3, prev.zoom + zoomDelta)),
    }));
  };

  const zoomIn = () => setCamera(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.2) }));
  const zoomOut = () => setCamera(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom - 0.2) }));

  // Get rank for selected tree
  const getTreeRank = (tree: UserTree): number => {
    const sorted = [...usersRef.current].sort((a, b) => b.xp - a.xp);
    return sorted.findIndex(u => u.id === tree.id) + 1;
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-slate-900 ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      />

      {/* Header */}
      <div className="fixed top-8 left-8 z-10 text-white pointer-events-none">
        <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-green-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-lg">
          Eternal Forest
        </h1>
        <p className="text-xl opacity-90 mt-1">Every soul is a tree. Watch the garden grow.</p>
        <p className="text-sm opacity-70 mt-2">
          Click trees to view • Drag to explore • Scroll to zoom • {users.length} souls growing
        </p>
      </div>

      {/* Controls */}
      <div className="fixed top-8 right-8 z-10 flex flex-col gap-2">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="bg-background/80 backdrop-blur-md hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button
          onClick={findMyTree}
          variant="secondary"
          className="bg-background/80 backdrop-blur-md hover:bg-background"
        >
          <Compass className="h-4 w-4 mr-2" />
          Find My Tree
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={zoomIn}
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-md"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            onClick={zoomOut}
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-md"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <ForestLegend />

      {/* Selected tree profile card */}
      {selectedTree && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(cardPosition.x, window.innerWidth - 300),
            top: Math.min(cardPosition.y, window.innerHeight - 350),
          }}
        >
          <TreeProfileCard
            user={selectedTree}
            rank={getTreeRank(selectedTree)}
            onClose={() => setSelectedTree(null)}
          />
        </div>
      )}
    </div>
  );
}
