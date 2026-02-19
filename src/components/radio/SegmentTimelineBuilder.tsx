import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SegmentTemplateSelector, SegmentItem } from './SegmentTemplateSelector';
import { SegmentAudioPicker } from './SegmentAudioPicker';
import { Plus, Trash2, Shuffle, GripVertical, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import confetti from 'canvas-confetti';

const SEGMENT_TYPES = [
  { type: 'opening', label: 'Opening', emoji: '🎤', color: '#f97316' },
  { type: 'teaching', label: 'Teaching', emoji: '📖', color: '#3b82f6' },
  { type: 'music', label: 'Music Play & Talk', emoji: '🎵', color: '#22c55e' },
  { type: 'advert', label: 'Advert', emoji: '📢', color: '#ef4444' },
  { type: 'qa', label: 'Q&A', emoji: '🙋', color: '#a855f7' },
  { type: 'guest', label: 'Guest Spot', emoji: '🤝', color: '#14b8a6' },
  { type: 'reflection', label: 'Reflection', emoji: '🧘', color: '#6366f1' },
  { type: 'freeflow', label: 'Free Flow', emoji: '🎙️', color: '#6b7280' },
];

const MAX_MINUTES = 120;

interface SegmentTimelineBuilderProps {
  segments: SegmentItem[];
  onSegmentsChange: (segments: SegmentItem[]) => void;
}

export const SegmentTimelineBuilder: React.FC<SegmentTimelineBuilderProps> = ({
  segments,
  onSegmentsChange,
}) => {
  const totalMinutes = segments.reduce((sum, s) => sum + s.duration, 0);
  const remaining = MAX_MINUTES - totalMinutes;
  const isOver = remaining < 0;
  const isExact = remaining === 0;

  const addSegment = (segType: typeof SEGMENT_TYPES[0]) => {
    const defaultDuration = segType.type === 'advert' ? 1 : segType.type === 'opening' ? 2 : 5;
    onSegmentsChange([
      ...segments,
      {
        type: segType.type,
        title: segType.label,
        duration: Math.min(defaultDuration, Math.max(1, remaining)),
        emoji: segType.emoji,
        color: segType.color,
      },
    ]);
  };

  const removeSegment = (index: number) => {
    onSegmentsChange(segments.filter((_, i) => i !== index));
  };

  const updateDuration = (index: number, dur: number) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], duration: Math.max(1, dur) };
    onSegmentsChange(updated);
  };

  const updateTitle = (index: number, title: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], title };
    onSegmentsChange(updated);
  };

  const attachAudio = (index: number, track: { id: string; title: string; url?: string; duration_seconds?: number }) => {
    const updated = [...segments];
    updated[index] = {
      ...updated[index],
      mapped_track_id: track.id,
      mapped_track_title: track.title,
      mapped_track_url: track.url,
      mapped_track_duration: track.duration_seconds,
    };
    onSegmentsChange(updated);
  };

  const clearAudio = (index: number) => {
    const updated = [...segments];
    updated[index] = {
      ...updated[index],
      mapped_track_id: undefined,
      mapped_track_title: undefined,
      mapped_track_url: undefined,
      mapped_track_duration: undefined,
    };
    onSegmentsChange(updated);
  };

  const shuffleSegments = () => {
    const shuffled = [...segments].sort(() => Math.random() - 0.5);
    onSegmentsChange(shuffled);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  };

  const handleReorder = (newOrder: SegmentItem[]) => {
    onSegmentsChange(newOrder);
  };

  return (
    <div className="space-y-5">
      {/* Template Selector */}
      <SegmentTemplateSelector onSelectTemplate={onSegmentsChange} />

      {/* Time Progress Bar */}
      <div className="p-4 rounded-xl bg-card border space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium flex items-center gap-1.5">
            {isExact ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : isOver ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : null}
            {totalMinutes} / {MAX_MINUTES} minutes
          </span>
          <span className={`text-xs font-medium ${isOver ? 'text-destructive' : isExact ? 'text-green-500' : 'text-muted-foreground'}`}>
            {isOver ? `${Math.abs(remaining)} min over!` : isExact ? 'Perfect! ✨' : `${remaining} min remaining`}
          </span>
        </div>
        <Progress value={Math.min(100, (totalMinutes / MAX_MINUTES) * 100)} className="h-3" />

        {/* Visual timeline bar */}
        {segments.length > 0 && (
          <div className="flex rounded-full overflow-hidden h-4 mt-2">
            {segments.map((s, i) => (
              <div
                key={i}
                style={{ width: `${(s.duration / MAX_MINUTES) * 100}%`, backgroundColor: s.color }}
                className="flex items-center justify-center text-[8px] text-white font-bold truncate transition-all"
                title={`${s.emoji} ${s.title} (${s.duration}m)`}
              >
                {s.duration >= 5 ? s.emoji : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Segment Buttons */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Add segments:</p>
        <div className="flex flex-wrap gap-1.5">
          {SEGMENT_TYPES.map((st) => (
            <Button
              key={st.type}
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1 hover:shadow-sm transition-shadow"
              style={{ borderColor: st.color, color: st.color }}
              onClick={() => addSegment(st)}
            >
              <span>{st.emoji}</span>
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Segment List (draggable) */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Your segments ({segments.length})
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={shuffleSegments}
            >
              <Shuffle className="h-3 w-3" />
              Shuffle for Fun 🎲
            </Button>
          </div>

          <Reorder.Group
            axis="y"
            values={segments}
            onReorder={handleReorder}
            className="space-y-2"
          >
            <AnimatePresence>
              {segments.map((seg, index) => (
                <Reorder.Item
                  key={`${seg.type}-${index}-${seg.title}`}
                  value={seg}
                  className="p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                  style={{ borderLeftWidth: 4, borderLeftColor: seg.color }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-lg shrink-0">{seg.emoji}</span>
                    <Input
                      value={seg.title}
                      onChange={(e) => updateTitle(index, e.target.value)}
                      className="h-7 text-xs flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={seg.duration}
                        onChange={(e) => updateDuration(index, parseInt(e.target.value) || 1)}
                        className="h-7 w-14 text-xs text-center"
                      />
                      <span className="text-[10px] text-muted-foreground">min</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSegment(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Audio attachment row */}
                  <div className="ml-10 mt-1">
                    <SegmentAudioPicker
                      segmentDuration={seg.duration}
                      currentTrackTitle={seg.mapped_track_title}
                      currentTrackDuration={seg.mapped_track_duration}
                      onSelect={(track) => attachAudio(index, track)}
                      onClear={() => clearAudio(index)}
                    />
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      )}

      {segments.length === 0 && (
        <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-xl border border-dashed">
          <p className="text-lg mb-1">🎛️</p>
          <p className="text-sm font-medium">No segments yet</p>
          <p className="text-xs">Pick a template above or add segments manually</p>
        </div>
      )}
    </div>
  );
};
