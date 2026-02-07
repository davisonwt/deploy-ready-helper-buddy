import { Info } from 'lucide-react';

export function ForestLegend() {
  return (
    <div className="fixed bottom-8 left-8 z-10 bg-background/80 backdrop-blur-md rounded-xl p-4 border border-border/50 max-w-xs">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Info className="h-4 w-4" />
        <span>Forest Guide</span>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            🌳
          </div>
          <span className="text-muted-foreground">Golden glow = Top 10</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5">
            <div className="w-2 h-3 bg-green-700 rounded-t" />
            <div className="w-3 h-5 bg-green-600 rounded-t" />
            <div className="w-4 h-7 bg-green-500 rounded-t" />
          </div>
          <span className="text-muted-foreground">Tree size = Level</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-full bg-green-800" />
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <div className="w-4 h-4 rounded-full bg-emerald-400" />
          </div>
          <span className="text-muted-foreground">Brightness = Activity</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/30 border-2 border-blue-500 flex items-center justify-center animate-pulse">
            👤
          </div>
          <span className="text-muted-foreground">Blue glow = Your tree</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <p>Inner rings = Top contributors</p>
        <p>Outer rings = Newer members</p>
      </div>
    </div>
  );
}
