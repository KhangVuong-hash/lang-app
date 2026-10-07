'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Check, Play, Repeat, SkipBack } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type ScriptSegment = {
  id?: string;
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

type ListeningProgress = {
  last_position: number;
  completed_segment_ids: string[];
} | null;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYoutubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return ytApiPromise;
}

export default function YouTubeScriptPlayer({
  videoId,
  lessonId,
  userId,
  segments,
  initialProgress,
}: {
  videoId: string;
  lessonId: string;
  userId: string;
  segments: ScriptSegment[];
  initialProgress: ListeningProgress;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const loopSegmentRef = useRef<ScriptSegment | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastObservedTimeRef = useRef(initialProgress?.last_position ?? 0);
  const lastSavedPositionRef = useRef(initialProgress?.last_position ?? 0);
  const progressRef = useRef({
    lastPosition: initialProgress?.last_position ?? 0,
    completedSegmentIds: new Set(initialProgress?.completed_segment_ids ?? []),
  });
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [completedSegmentIds, setCompletedSegmentIds] = useState(
    () => new Set(initialProgress?.completed_segment_ids ?? [])
  );

  const persistProgress = useCallback(() => {
    lastSavedPositionRef.current = progressRef.current.lastPosition;
    const supabase = createClient();
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const { error } = await supabase.from('listening_progress').upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          last_position: progressRef.current.lastPosition,
          completed_segment_ids: [...progressRef.current.completedSegmentIds],
        },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) console.error('Could not save listening progress:', error.message);
    });
  }, [lessonId, userId]);

  const markSegmentComplete = useCallback(
    (segmentId: string) => {
      if (progressRef.current.completedSegmentIds.has(segmentId)) return;
      progressRef.current.completedSegmentIds.add(segmentId);
      setCompletedSegmentIds(new Set(progressRef.current.completedSegmentIds));
      persistProgress();
    },
    [persistProgress]
  );

  function toggleSegmentComplete(segmentId: string) {
    const completed = progressRef.current.completedSegmentIds;
    if (completed.has(segmentId)) completed.delete(segmentId);
    else completed.add(segmentId);
    setCompletedSegmentIds(new Set(completed));
    persistProgress();
  }

  useEffect(() => {
    let mounted = true;
    loadYoutubeApi().then(() => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: any) => {
            if (initialProgress?.last_position) {
              e.target.seekTo(initialProgress.last_position, true);
            }
            lastObservedTimeRef.current = e.target.getCurrentTime();
            setReady(true);
          },
          onStateChange: (e: any) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.PAUSED) {
              progressRef.current.lastPosition = e.target.getCurrentTime();
              persistProgress();
            }
          },
        },
      });
    });
    return () => {
      mounted = false;
      if (playerRef.current?.destroy) playerRef.current.destroy();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, persistProgress]);

  // Vòng lặp theo dõi currentTime + xử lý loop 1 segment
  useEffect(() => {
    function tick() {
      if (playerRef.current?.getCurrentTime) {
        const t = playerRef.current.getCurrentTime();
        setCurrentTime(t);
        const previousTime = lastObservedTimeRef.current;
        progressRef.current.lastPosition = t;
        if (t > previousTime && t - previousTime < 1.5) {
          const justCompleted = segments.find(
            (segment) => segment.id && previousTime < segment.end_seconds && t >= segment.end_seconds
          );
          if (justCompleted?.id) markSegmentComplete(justCompleted.id);
        }
        lastObservedTimeRef.current = t;

        if (isPlaying && Math.abs(t - lastSavedPositionRef.current) >= 3) {
          lastSavedPositionRef.current = t;
          persistProgress();
        }

        const idx = segments.findIndex((s) => t >= s.start_seconds && t < s.end_seconds);
        setActiveSegmentIdx(idx >= 0 ? idx : null);

        if (loopEnabled && loopSegmentRef.current && t >= loopSegmentRef.current.end_seconds) {
          playerRef.current.seekTo(loopSegmentRef.current.start_seconds, true);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [segments, loopEnabled, isPlaying, markSegmentComplete, persistProgress]);

  const seekToSegment = useCallback((seg: ScriptSegment, autoplay = true) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(seg.start_seconds, true);
    if (autoplay) playerRef.current.playVideo();
  }, []);

  const toggleLoopOnSegment = useCallback(
    (seg: ScriptSegment) => {
      if (loopSegmentRef.current?.order_index === seg.order_index && loopEnabled) {
        setLoopEnabled(false);
        loopSegmentRef.current = null;
      } else {
        loopSegmentRef.current = seg;
        setLoopEnabled(true);
        seekToSegment(seg, true);
      }
    },
    [loopEnabled, seekToSegment]
  );

  function changeRate(rate: number) {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate?.(rate);
  }

  function resumeListening() {
    if (!playerRef.current) return;
    playerRef.current.seekTo(progressRef.current.lastPosition, true);
    playerRef.current.playVideo();
  }

  function replaySegment(seg: ScriptSegment) {
    seekToSegment(seg, true);
  }

  const completedCount = segments.filter(
    (segment) => segment.id && completedSegmentIds.has(segment.id)
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Video */}
      <div className="lg:col-span-2">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <div ref={containerRef} className="h-full w-full" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Tốc độ:</span>
          {[0.5, 0.75, 1, 1.25].map((r) => (
            <button
              key={r}
              onClick={() => changeRate(r)}
              className={`rounded-full px-2.5 py-1 ${
                playbackRate === r ? 'bg-brand text-white' : 'bg-paper text-ink-soft'
              }`}
            >
              {r}x
            </button>
          ))}
          {initialProgress?.last_position || currentTime > 0 ? (
            <button
              onClick={resumeListening}
              disabled={!ready}
              className="btn-primary btn-sm ml-auto inline-flex items-center gap-1.5"
              title={`Tiếp tục từ ${formatTime(progressRef.current.lastPosition)}`}
            >
              <Play className="h-3.5 w-3.5" /> Tiếp tục {formatTime(progressRef.current.lastPosition)}
            </button>
          ) : null}
          {loopEnabled && (
            <span className="pill ml-auto inline-flex items-center gap-1 bg-highlight-soft text-ink">
              <Repeat className="h-3 w-3" /> Đang lặp câu #{(loopSegmentRef.current?.order_index ?? 0) + 1}
            </span>
          )}
        </div>
      </div>

      {/* Script list */}
      <div className="card max-h-[480px] overflow-y-auto lg:col-span-3">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-2 text-xs text-ink-soft">
          <span>Đã nghe {completedCount}/{segments.length} câu</span>
          {activeSegmentIdx !== null && <span>Đang học câu #{activeSegmentIdx + 1}</span>}
        </div>
        {segments.length === 0 && (
          <p className="p-4 text-sm text-ink-soft">Chưa có script cho video này.</p>
        )}
        <ul className="divide-y divide-line">
          {segments.map((seg, idx) => (
            <li
              key={seg.id ?? idx}
              className={`flex items-start gap-3 p-3 text-sm transition ${
                activeSegmentIdx === idx ? 'bg-highlight-soft/50' : 'hover:bg-paper'
              }`}
            >
              <span className="mt-0.5 w-12 shrink-0 text-xs tabular-nums text-ink-faint">
                {formatTime(seg.start_seconds)}
              </span>
              <p className="flex-1 leading-relaxed">{seg.text_content}</p>
              <div className="flex shrink-0 gap-1">
                {seg.id && (
                  <button
                    title={completedSegmentIds.has(seg.id) ? 'Đánh dấu chưa học' : 'Đánh dấu đã học'}
                    aria-label={completedSegmentIds.has(seg.id) ? 'Đánh dấu chưa học' : 'Đánh dấu đã học'}
                    aria-pressed={completedSegmentIds.has(seg.id)}
                    onClick={() => toggleSegmentComplete(seg.id!)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${
                      completedSegmentIds.has(seg.id)
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-line text-ink-faint hover:bg-paper'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  title="Tua lại đoạn này"
                  onClick={() => replaySegment(seg)}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:bg-paper"
                >
                  <SkipBack className="h-3 w-3" /> Tua
                </button>
                <button
                  title="Lặp lại liên tục đoạn này"
                  onClick={() => toggleLoopOnSegment(seg)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-paper ${
                    loopEnabled && loopSegmentRef.current?.order_index === seg.order_index
                      ? 'border-highlight-dark bg-highlight'
                      : 'border-line'
                  }`}
                >
                  <Repeat className="h-3 w-3" /> Lặp
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
