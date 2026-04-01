'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { useFlowStore } from '@/stores/use-flow-store';

export function TimelineSlider() {
  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);
  const setTimelineIndex = useFlowStore((s) => s.setTimelineIndex);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Group traces by unique timestamps
  const timestamps = [...new Set(traceData.map((t) => t.timestamp))].sort();
  const maxIndex = Math.max(0, timestamps.length - 1);

  useEffect(() => {
    if (playing && timelineIndex < maxIndex) {
      intervalRef.current = setInterval(() => {
        setTimelineIndex(Math.min(timelineIndex + 1, maxIndex));
      }, 500);
    } else {
      setPlaying(false);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, timelineIndex, maxIndex, setTimelineIndex]);

  const handlePlay = useCallback(() => {
    if (timelineIndex >= maxIndex) {
      setTimelineIndex(0);
    }
    setPlaying(true);
  }, [timelineIndex, maxIndex, setTimelineIndex]);

  if (backtestStatus !== 'completed' || timestamps.length === 0) {
    return null;
  }

  const currentTs = timestamps[timelineIndex];
  const formattedDate = currentTs
    ? new Date(currentTs).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-[#0f1117] px-4 py-2">
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTimelineIndex(Math.max(0, timelineIndex - 1))}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="이전"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={playing ? () => setPlaying(false) : handlePlay}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label={playing ? '일시정지' : '재생'}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => setTimelineIndex(Math.min(maxIndex, timelineIndex + 1))}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="다음"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={maxIndex}
        value={timelineIndex}
        onChange={(e) => {
          setPlaying(false);
          setTimelineIndex(Number(e.target.value));
        }}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-emerald-500"
      />

      {/* Timestamp display */}
      <span className="min-w-[120px] text-right text-[10px] text-zinc-400">
        {formattedDate} ({timelineIndex + 1}/{timestamps.length})
      </span>
    </div>
  );
}
