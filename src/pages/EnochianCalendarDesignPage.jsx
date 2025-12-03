import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { YHVHWheelCalendarLive } from '@/components/watch/YHVHWheelCalendar';
import { YHVHWheelCalendarEditable } from '@/components/watch/YHVHWheelCalendarEditable';
import { useVisualEditor } from '@/contexts/VisualEditorContext';
import EnochianWheelCalendar from '@/components/watch/EnochianWheelCalendar';
import { LocationVerification } from '@/components/calendar/LocationVerification';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export default function EnochianCalendarDesignPage() {
  const { isEditorMode } = useVisualEditor();
  const [wheelPosition, setWheelPosition] = useState({ x: 0, y: 0 });
  const [beadsPosition, setBeadsPosition] = useState({ x: 0, y: 0 });

  // Load saved positions from localStorage
  useEffect(() => {
    const savedWheel = localStorage.getItem('calendar-wheel-position');
    const savedBeads = localStorage.getItem('calendar-beads-position');
    if (savedWheel) setWheelPosition(JSON.parse(savedWheel));
    if (savedBeads) setBeadsPosition(JSON.parse(savedBeads));
  }, []);

  const handleResetPositions = () => {
    setWheelPosition({ x: 0, y: 0 });
    setBeadsPosition({ x: 0, y: 0 });
    localStorage.removeItem('calendar-wheel-position');
    localStorage.removeItem('calendar-beads-position');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a15] via-[#1a1a2e] to-[#0a0a15] overflow-x-hidden">
      {/* Header */}
      <div className="container mx-auto pt-6 pb-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
            Ed's Beads
          </h1>
          <Button
            onClick={handleResetPositions}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Layout
          </Button>
        </div>
        <LocationVerification />
      </div>

      {/* Main content - Two column layout on large screens */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center relative">
          
          {/* Left: Rotational Wheel Calendar (2/3 width) - DRAGGABLE */}
          <motion.div 
            className="w-full lg:w-2/3 flex flex-col items-center cursor-move"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            style={{ x: wheelPosition.x, y: wheelPosition.y }}
            onDragEnd={(e, info) => {
              const newPosition = { x: info.offset.x, y: info.offset.y };
              setWheelPosition(newPosition);
              localStorage.setItem('calendar-wheel-position', JSON.stringify(newPosition));
            }}
            whileHover={{ scale: 1.01 }}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
          >
            <div className="glass-card p-6 rounded-3xl w-full max-w-4xl shadow-xl border-2 border-amber-500/20 hover:border-amber-500/40 transition-colors">
              {/* Wheel Calendar - responsive sizing */}
              <div className="flex justify-center">
                {isEditorMode ? (
                  <YHVHWheelCalendarEditable size={Math.min(700, typeof window !== 'undefined' ? window.innerWidth * 0.6 : 700)} />
                ) : (
                  <YHVHWheelCalendarLive size={Math.min(700, typeof window !== 'undefined' ? window.innerWidth * 0.6 : 700)} />
                )}
              </div>
            </div>
          </motion.div>

          {/* Right: Month Bead Strands (1/3 width) - DRAGGABLE */}
          <motion.div 
            className="w-full lg:w-1/3 flex flex-col items-center cursor-move"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            style={{ x: beadsPosition.x, y: beadsPosition.y }}
            onDragEnd={(e, info) => {
              const newPosition = { x: info.offset.x, y: info.offset.y };
              setBeadsPosition(newPosition);
              localStorage.setItem('calendar-beads-position', JSON.stringify(newPosition));
            }}
            whileHover={{ scale: 1.01 }}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
          >
            <div className="glass-card p-4 rounded-3xl bg-purple-900/30 border border-purple-500/30 w-full max-w-sm shadow-xl border-2 hover:border-purple-500/60 transition-colors">
              <h2 className="text-lg md:text-xl font-bold text-center text-purple-300 mb-4">
                Month Bead Strands
              </h2>
              
              {/* Scrollable container for bead strands */}
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-purple-900/30">
                <EnochianWheelCalendar />
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
