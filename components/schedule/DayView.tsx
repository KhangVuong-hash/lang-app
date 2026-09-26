'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  expandOccurrences,
  formatDate,
  formatDuration,
  minutesBetween,
  todayLocal,
  type Occurrence,
  type ScheduleException,
  type ScheduleRule,
} from '@/lib/schedule';

/** chiều cao một giờ trên lưới (px) */
const HOUR_PX = 56;
/** giờ cuộn tới khi ngày không có buổi nào */
const DEFAULT_SCROLL_HOUR = 7;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, '0');

type Placed = { o: Occurrence; col: number; cols: number };

/**
 * Xếp các buổi trùng giờ thành cột cạnh nhau (kiểu Outlook): gom các buổi chồng
 * nhau thành cụm, mỗi buổi vào cột trống đầu tiên, cả cụm chia đều bề ngang.
 */
function layout(items: Occurrence[]): Placed[] {
  const sorted = [...items].sort(
    (a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end)
  );
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let colEnds: string[] = [];
  let clusterEnd = '';

  const flush = () => {
    for (const p of cluster) p.cols = colEnds.length;
    out.push(...cluster);
    cluster = [];
    colEnds = [];
  };

  for (const o of sorted) {
    if (cluster.length && o.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= o.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(o.end);
    } else colEnds[col] = o.end;
    cluster.push({ o, col, cols: 0 });
    if (o.end > clusterEnd || cluster.length === 1) clusterEnd = o.end;
  }
  flush();
  return out;
}

/**
 * Lịch theo ngày: trục 0h-24h, mỗi buổi là một khối cao theo thời lượng.
 * Bấm vào ô giờ trống để thêm buổi bắt đầu từ giờ đó.
 */
export default function DayView({
  date,
  onDateChange,
  rules,
  exceptions,
  colorOf,
  focusId,
  now,
  onSelect,
  onSlotClick,
  toolbar,
}: {
  date: string;
  onDateChange: (date: string) => void;
  rules: ScheduleRule[];
  exceptions: ScheduleException[];
  colorOf: (ruleId: string) => string;
  focusId: string | null;
  /** giờ hiện tại (chỉ có ở client) để vẽ vạch "bây giờ" */
  now: { date: string; time: string } | null;
  onSelect: (o: Occurrence) => void;
  /** bấm vào ô giờ trống, `time` dạng 'HH:MM' */
  onSlotClick: (date: string, time: string) => void;
  toolbar?: ReactNode;
}) {
  const today = now?.date ?? todayLocal();
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => expandOccurrences(rules, exceptions, date, date),
    [rules, exceptions, date]
  );
  const placed = useMemo(() => layout(items), [items]);
  const active = items.filter((o) => o.status !== 'cancelled');
  const total = active.reduce((n, o) => n + minutesBetween(o.start, o.end), 0);

  // khi đổi ngày: cuộn tới buổi đầu tiên (hoặc giờ hiện tại nếu là hôm nay)
  const firstStart = items[0]?.start;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let hour = DEFAULT_SCROLL_HOUR;
    if (firstStart) hour = Math.floor(toMin(firstStart) / 60);
    if (date === today && now) hour = Math.min(hour, Math.floor(toMin(now.time) / 60));
    el.scrollTop = Math.max(0, hour - 1) * HOUR_PX;
    // chỉ cuộn khi đổi ngày, không giật mỗi phút
  }, [date, firstStart]);

  const nowTop = now && date === today ? (toMin(now.time) / 60) * HOUR_PX : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDateChange(today)}
            className="btn-secondary btn-sm"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => onDateChange(addDays(date, -1))}
            className="btn-ghost btn-sm"
            aria-label="Ngày trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(addDays(date, 1))}
            className="btn-ghost btn-sm"
            aria-label="Ngày sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="input h-8 w-auto py-0 text-sm"
            aria-label="Chọn ngày"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 font-display text-lg font-semibold">{formatDate(date)}</h2>
          {toolbar}
        </div>
      </div>

      <p className="mb-2 text-xs text-ink-soft">
        {active.length
          ? `${active.length} buổi · tổng ${formatDuration(total)}`
          : 'Không có buổi học nào trong ngày này.'}
      </p>

      <div
        ref={scrollRef}
        className="max-h-[36rem] overflow-y-auto rounded-lg border border-line bg-surface"
      >
        <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
          {/* cột giờ */}
          <div className="w-14 shrink-0 border-r border-line">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="relative text-right text-[11px] text-ink-faint"
                style={{ height: HOUR_PX }}
              >
                {h > 0 && <span className="absolute -top-2 right-2">{pad(h)}:00</span>}
              </div>
            ))}
          </div>

          {/* vùng sự kiện */}
          <div className="relative flex-1">
            {Array.from({ length: 48 }, (_, i) => {
              const time = `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSlotClick(date, time)}
                  aria-label={`Thêm buổi học lúc ${time}`}
                  className={`block w-full hover:bg-paper ${
                    i % 2 ? 'border-b border-line' : 'border-b border-dashed border-line/60'
                  }`}
                  style={{ height: HOUR_PX / 2 }}
                />
              );
            })}

            {placed.map(({ o, col, cols }) => {
              const top = (toMin(o.start) / 60) * HOUR_PX;
              const height = Math.max((minutesBetween(o.start, o.end) / 60) * HOUR_PX, HOUR_PX / 3);
              const dim = focusId && o.rule.id !== focusId;
              const cancelled = o.status === 'cancelled';
              const short = height < HOUR_PX * 0.75;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => onSelect(o)}
                  title={`${o.start}-${o.end}${o.rule.title ? ` · ${o.rule.title}` : ''}`}
                  className={`absolute overflow-hidden rounded-md border border-white/60 px-1.5 py-0.5 text-left text-xs shadow-sm transition-opacity hover:z-10 hover:shadow-md ${colorOf(
                    o.rule.id
                  )} ${dim ? 'opacity-25' : ''} ${
                    focusId && !dim ? 'ring-2 ring-ink/40 ring-offset-1' : ''
                  } ${cancelled ? 'line-through opacity-50' : ''}`}
                  style={{
                    top,
                    height,
                    left: `calc(${(col / cols) * 100}% + 2px)`,
                    width: `calc(${100 / cols}% - 4px)`,
                  }}
                >
                  {short ? (
                    <span className="block truncate">
                      <span className="font-semibold">{o.rule.title || 'Tự học'}</span> {o.start}-
                      {o.end}
                    </span>
                  ) : (
                    <>
                      <span className="block truncate font-semibold">
                        {o.rule.title || 'Tự học'}
                        {o.status === 'rescheduled' && ' (dời)'}
                      </span>
                      <span className="block truncate opacity-90">
                        {o.start}-{o.end}
                      </span>
                      {o.rule.location && (
                        <span className="block truncate opacity-80">{o.rule.location}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}

            {nowTop !== null && (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: nowTop }}
              >
                <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="h-0.5 flex-1 bg-danger" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
