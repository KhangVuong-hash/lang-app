'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type ScriptSegment = {
  id?: string;
  order_index: number;
  start_seconds: number;
  end_seconds: number;
  text_content: string;
};

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
  segments,
}: {
  videoId: string;
  segments: ScriptSegment[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const loopSegmentRef = useRef<ScriptSegment | null>(null);
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    let mounted = true;
    loadYoutubeApi().then(() => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
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
  }, [videoId]);

  // Vòng lặp theo dõi currentTime + xử lý loop 1 segment
  useEffect(() => {
    function tick() {
      if (playerRef.current?.getCurrentTime) {
        const t = playerRef.current.getCurrentTime();
        setCurrentTime(t);

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
  }, [segments, loopEnabled]);

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

  function replaySegment(seg: ScriptSegment) {
    seekToSegment(seg, true);
  }

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
          {loopEnabled && (
            <span className="pill ml-auto bg-highlight-soft text-ink">
              🔁 Đang lặp câu #{(loopSegmentRef.current?.order_index ?? 0) + 1}
            </span>
          )}
        </div>
      </div>

      {/* Script list */}
      <div className="card max-h-[480px] overflow-y-auto lg:col-span-3">
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
                <button
                  title="Tua lại đoạn này"
                  onClick={() => replaySegment(seg)}
                  className="rounded-md border border-line px-2 py-1 text-xs hover:bg-paper"
                >
                  ⏮ Tua
                </button>
                <button
                  title="Lặp lại liên tục đoạn này"
                  onClick={() => toggleLoopOnSegment(seg)}
                  className={`rounded-md border px-2 py-1 text-xs hover:bg-paper ${
                    loopEnabled && loopSegmentRef.current?.order_index === seg.order_index
                      ? 'border-highlight-dark bg-highlight'
                      : 'border-line'
                  }`}
                >
                  🔁 Lặp
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
