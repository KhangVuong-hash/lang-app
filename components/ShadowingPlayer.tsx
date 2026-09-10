'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AudioRecorder from './AudioRecorder';
import type { ScriptSegment } from './YouTubeScriptPlayer';

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

export default function ShadowingPlayer({
  videoId,
  segments,
  showRecorder = true,
}: {
  videoId: string;
  segments: (ScriptSegment & { id: string })[];
  showRecorder?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const loopSegmentRef = useRef<ScriptSegment | null>(null);
  const rafRef = useRef<number | null>(null);

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
      });
    });
    return () => {
      mounted = false;
      if (playerRef.current?.destroy) playerRef.current.destroy();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    function tick() {
      if (playerRef.current?.getCurrentTime) {
        const t = playerRef.current.getCurrentTime();
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

  const seekToSegment = useCallback((seg: ScriptSegment) => {
    playerRef.current?.seekTo(seg.start_seconds, true);
    playerRef.current?.playVideo();
  }, []);

  const toggleLoopOnSegment = useCallback(
    (seg: ScriptSegment) => {
      if (loopSegmentRef.current?.order_index === seg.order_index && loopEnabled) {
        setLoopEnabled(false);
        loopSegmentRef.current = null;
      } else {
        loopSegmentRef.current = seg;
        setLoopEnabled(true);
        seekToSegment(seg);
      }
    },
    [loopEnabled, seekToSegment]
  );

  function changeRate(rate: number) {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate?.(rate);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
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
        </div>
      </div>

      <div className="card max-h-[520px] overflow-y-auto lg:col-span-3">
        <ul className="divide-y divide-line">
          {segments.map((seg, idx) => (
            <li
              key={seg.id}
              className={`p-3 text-sm ${activeSegmentIdx === idx ? 'bg-highlight-soft/50' : 'hover:bg-paper'}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-10 shrink-0 text-xs tabular-nums text-ink-faint">#{idx + 1}</span>
                <p className="flex-1 leading-relaxed">{seg.text_content}</p>
              </div>
              <div className="mt-2 flex items-center justify-between pl-[52px]">
                <div className="flex gap-1">
                  <button
                    onClick={() => seekToSegment(seg)}
                    className="rounded-md border border-line px-2 py-1 text-xs hover:bg-paper"
                  >
                    ⏮ Tua
                  </button>
                  <button
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
                {showRecorder && <AudioRecorder segmentId={seg.id} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
