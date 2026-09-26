"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  WEEKDAY_SHORT,
  WEEK_ORDER,
  addDays,
  expandOccurrences,
  formatDate,
  mondayOf,
  todayLocal,
  type Occurrence,
  type ScheduleException,
  type ScheduleRule,
} from "@/lib/schedule";

/** số buổi hiện trong một ô ngày trước khi gộp thành "+N" */
const MAX_PER_DAY = 3;

/** màu cho từng lịch, xoay vòng theo thứ tự */
export const RULE_COLORS = [
  "bg-brand text-white",
  "bg-skill-speaking text-white",
  "bg-skill-listening text-white",
  "bg-skill-writing text-white",
  "bg-skill-reading text-white",
  "bg-highlight text-ink",
];

/**
 * Lịch tháng kiểu Google Calendar (T2 → CN, 6 hàng). `month` là 'YYYY-MM'.
 * Khi `focusId` có giá trị, buổi của lịch đó nổi bật, các lịch khác mờ đi.
 * Kéo-thả một buổi sang ô ngày khác để dời (chuột; màn cảm ứng dùng hộp thoại "Dời buổi").
 */
export default function MonthView({
  month,
  onMonthChange,
  rules,
  exceptions,
  colorOf,
  focusId,
  onSelect,
  onDayClick,
  onMove,
  toolbar,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  rules: ScheduleRule[];
  exceptions: ScheduleException[];
  colorOf: (ruleId: string) => string;
  focusId: string | null;
  onSelect: (o: Occurrence) => void;
  /** bấm vào ô ngày (mở lịch theo giờ của ngày đó) */
  onDayClick: (date: string) => void;
  /** kéo-thả một buổi sang ngày khác */
  onMove: (o: Occurrence, date: string) => void;
  /** nút thao tác hiển thị cạnh tiêu đề tháng */
  toolbar?: ReactNode;
}) {
  const today = todayLocal();
  const [moreDay, setMoreDay] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Occurrence | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);

  const first = `${month}-01`;
  const gridStart = mondayOf(first);
  const gridEnd = addDays(gridStart, 41);

  const byDate = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const o of expandOccurrences(rules, exceptions, gridStart, gridEnd)) {
      const list = map.get(o.date) ?? [];
      list.push(o);
      map.set(o.date, list);
    }
    // lịch đang chọn lên đầu ô để không bị gộp vào "+N"
    if (focusId) {
      for (const list of map.values())
        list.sort(
          (a, b) =>
            Number(b.rule.id === focusId) - Number(a.rule.id === focusId),
        );
    }
    return map;
  }, [rules, exceptions, gridStart, gridEnd, focusId]);

  const [y, m] = month.split("-").map(Number);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    onMonthChange(d.toISOString().slice(0, 7));
  };

  const chip = (o: Occurrence, compact: boolean) => {
    const dim = focusId && o.rule.id !== focusId;
    const cancelled = o.status === "cancelled";
    return (
      <button
        key={o.key}
        type="button"
        // chỉ kéo được trong lưới tháng (không phải trong hộp "+N buổi")
        draggable={compact}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", o.key);
          setDragging(o);
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropDate(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setMoreDay(null);
          onSelect(o);
        }}
        title={`${o.start}-${o.end}${o.rule.title ? ` · ${o.rule.title}` : ""}`}
        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity ${
          compact ? "cursor-grab active:cursor-grabbing" : ""
        } ${dragging?.key === o.key ? "opacity-40" : ""} ${colorOf(
          o.rule.id,
        )} ${dim ? "opacity-25" : ""} ${
          focusId && !dim ? "ring-2 ring-ink/40 ring-offset-1" : ""
        } ${cancelled ? "line-through opacity-50" : ""} ${compact ? "" : "py-1"}`}
      >
        <span className="font-semibold">{o.start}</span>{" "}
        {o.rule.title || "Tự học"}
        {o.status === "rescheduled" && " (dời)"}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(today.slice(0, 7))}
            className="btn-secondary btn-sm"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => shift(-1)}
            className="btn-ghost btn-sm"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="btn-ghost btn-sm"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 font-display text-lg font-semibold">
            Tháng {m}, {y}
          </h2>
          {toolbar}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-paper text-center text-xs font-medium text-ink-faint">
          {WEEK_ORDER.map((d) => (
            <div key={d} className="py-1.5">
              {WEEKDAY_SHORT[d]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }, (_, i) => {
            const date = addDays(gridStart, i);
            const inMonth = date.startsWith(month);
            const items = byDate.get(date) ?? [];
            const isToday = date === today;
            const extra = items.length - MAX_PER_DAY;
            return (
              <div
                key={date}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(date)}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropDate !== date) setDropDate(date);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDropDate(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const o = dragging;
                  setDragging(null);
                  setDropDate(null);
                  if (o && o.date !== date) onMove(o, date);
                }}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onDayClick(date);
                  }
                }}
                aria-label={`Xem theo giờ ngày ${formatDate(date)}`}
                className={`min-h-[4.5rem] cursor-pointer border-b border-r border-line p-1 hover:bg-paper sm:min-h-[6.5rem] ${
                  i % 7 === 6 ? "border-r-0" : ""
                } ${i >= 35 ? "border-b-0" : ""} ${
                  dropDate === date
                    ? "bg-highlight-soft/70 outline-dashed outline-2 -outline-offset-2 outline-brand"
                    : inMonth
                      ? "bg-surface"
                      : "bg-paper/60"
                }`}
              >
                <div className="mb-1 flex justify-center">
                  <span
                    className={`grid h-6 min-w-[1.5rem] place-items-center rounded-full px-1 text-xs ${
                      isToday
                        ? "bg-brand font-semibold text-white"
                        : inMonth
                          ? "text-ink hover:bg-black/10"
                          : "text-ink-faint hover:bg-black/10"
                    }`}
                  >
                    {date.endsWith("-01")
                      ? `${Number(date.slice(8))}/${Number(date.slice(5, 7))}`
                      : Number(date.slice(8))}
                  </span>
                </div>

                {/* màn nhỏ: chỉ hiện chấm màu, bấm "+" để xem */}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreDay(date);
                    }}
                    className="flex w-full flex-wrap justify-center gap-0.5 sm:hidden"
                    aria-label={`${items.length} buổi học`}
                  >
                    {items.slice(0, 4).map((o) => (
                      <span
                        key={o.key}
                        className={`h-1.5 w-1.5 rounded-full ${colorOf(o.rule.id).split(" ")[0]} ${
                          focusId && o.rule.id !== focusId ? "opacity-25" : ""
                        }`}
                      />
                    ))}
                  </button>
                )}

                <div className="hidden space-y-0.5 sm:block">
                  {items.slice(0, MAX_PER_DAY).map((o) => chip(o, true))}
                  {extra > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreDay(date);
                      }}
                      className="w-full rounded px-1.5 text-left text-xs font-medium text-ink-soft hover:bg-black/5"
                    >
                      +{extra} buổi nữa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!moreDay} onOpenChange={(o) => !o && setMoreDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="mb-3 pr-8 font-display text-base font-semibold text-ink">
            {moreDay && formatDate(moreDay)}
          </DialogTitle>
          <div className="space-y-1.5">
            {(moreDay ? (byDate.get(moreDay) ?? []) : []).map((o) =>
              chip(o, false),
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const d = moreDay!;
              setMoreDay(null);
              onDayClick(d);
            }}
            className="btn-secondary btn-sm mt-4"
          >
            Xem theo giờ
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
