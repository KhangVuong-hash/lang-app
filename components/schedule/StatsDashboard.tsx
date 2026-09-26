'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { categoryColor } from '@/components/schedule/categoryColors';
import {
  WEEKDAY_SHORT,
  formatDate,
  formatDayMonth,
  formatDuration,
  todayLocal,
  weekdayOf,
  type ScheduleException,
  type ScheduleRule,
  type SessionLog,
  type StudyCategory,
} from '@/lib/schedule';
import {
  NO_CATEGORY,
  computeStats,
  periodRange,
  shiftPeriod,
  type DayStat,
  type Period,
  type PeriodStats,
} from '@/lib/scheduleStats';

/** '3 giờ 20 phút' gọn hơn cho nhãn chart: '3h20' */
function shortDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}p`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

type CategoryInfo = { id: string; name: string; hex: string };

/**
 * Trang thống kê: thời gian học theo danh mục, theo ngày và tỷ lệ hoàn thành
 * trong một tuần / tháng.
 */
export default function StatsDashboard({
  rules,
  exceptions,
  categories,
  logs,
}: {
  rules: ScheduleRule[];
  exceptions: ScheduleException[];
  categories: StudyCategory[];
  logs: SessionLog[];
}) {
  const today = todayLocal();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);

  // thứ tự & màu danh mục cố định theo danh sách (không theo xếp hạng)
  const catInfo = useMemo(() => {
    const list: CategoryInfo[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      hex: categoryColor(c.color).hex,
    }));
    list.push({ id: NO_CATEGORY, name: 'Chưa phân loại', hex: categoryColor(null).hex });
    return list;
  }, [categories]);
  const catById = useMemo(() => new Map(catInfo.map((c) => [c.id, c])), [catInfo]);

  const { from, to } = periodRange(period, anchor);
  const stats = useMemo(
    () => computeStats(rules, exceptions, logs, from, to, today),
    [rules, exceptions, logs, from, to, today]
  );
  const prev = useMemo(() => {
    const r = periodRange(period, shiftPeriod(period, anchor, -1));
    return computeStats(rules, exceptions, logs, r.from, r.to, today);
  }, [rules, exceptions, logs, period, anchor, today]);

  // 8 tuần / 6 tháng gần nhất, kết thúc ở kỳ đang xem
  const series = useMemo(() => {
    const n = period === 'week' ? 8 : 6;
    return Array.from({ length: n }, (_, i) => {
      const r = periodRange(period, shiftPeriod(period, anchor, i - n + 1));
      return computeStats(rules, exceptions, logs, r.from, r.to, today);
    });
  }, [rules, exceptions, logs, period, anchor, today]);
  const seriesCats = catInfo.filter((c) =>
    series.some((p) => p.byCategory.some((s) => s.categoryId === c.id && s.actual))
  );

  // chỉ vẽ danh mục có buổi trong kỳ, giữ thứ tự cố định
  const usedCats = catInfo.filter((c) => stats.byCategory.some((s) => s.categoryId === c.id));
  const unit = period === 'week' ? 'tuần' : 'tháng';
  const marked = stats.completed + stats.notCompleted;
  const delta = stats.actual - prev.actual;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor(today)}
            className="btn-secondary btn-sm whitespace-nowrap"
          >
            Hiện tại
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}
            className="btn-ghost btn-sm"
            aria-label={`${unit} trước`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}
            className="btn-ghost btn-sm"
            aria-label={`${unit} sau`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 font-display text-lg font-semibold">
            {period === 'week'
              ? `${formatDate(from, false)} - ${formatDate(to, false)}`
              : `Tháng ${Number(from.slice(5, 7))}/${from.slice(0, 4)}`}
          </h2>
        </div>
        <div className="inline-flex rounded-lg border border-line p-0.5">
          {(
            [
              { v: 'week', label: 'Tuần' },
              { v: 'month', label: 'Tháng' },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPeriod(o.v)}
              aria-pressed={period === o.v}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                period === o.v ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {stats.sessions === 0 && stats.cancelled === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft">Không có buổi học nào trong {unit} này.</p>
          <Link
            href="/profile/schedule"
            className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
          >
            Mở thời khóa biểu
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Thời gian học thực tế"
              value={formatDuration(stats.actual)}
              sub={
                <>
                  Dự kiến {formatDuration(stats.planned)} · đạt {pct(stats.actual, stats.planned)}%
                </>
              }
            />
            <Tile
              label="Tỷ lệ hoàn thành"
              value={marked ? `${pct(stats.completed, marked)}%` : '-'}
              sub={
                marked ? `${stats.completed}/${marked} buổi đã đánh dấu` : 'Chưa đánh dấu buổi nào'
              }
            />
            <Tile
              label="Số buổi"
              value={`${stats.sessions} buổi`}
              sub={
                <>
                  <span className="text-success">{stats.completed} hoàn thành</span> ·{' '}
                  <span className="text-danger">{stats.notCompleted} không</span> ·{' '}
                  {stats.unmarkedPast + stats.upcoming} chưa đánh dấu
                  {stats.cancelled ? ` · ${stats.cancelled} huỷ` : ''}
                </>
              }
            />
            <Tile
              label={`So với ${unit} trước`}
              value={
                prev.actual || stats.actual
                  ? `${delta >= 0 ? '+' : '-'}${formatDuration(Math.abs(delta))}`
                  : '-'
              }
              sub={`${unit[0].toUpperCase()}${unit.slice(1)} trước: ${formatDuration(prev.actual)} thực tế`}
            />
          </div>

          {stats.unmarkedPast > 0 && (
            <p className="rounded-lg bg-highlight-soft/60 px-3 py-2 text-sm text-ink">
              Còn {stats.unmarkedPast} buổi đã qua chưa đánh dấu hoàn thành / không hoàn thành. Bấm
              vào buổi trong{' '}
              <Link href="/profile/schedule" className="font-medium text-brand hover:underline">
                thời khóa biểu
              </Link>{' '}
              để đánh dấu - thống kê chỉ tính thời gian của buổi đã hoàn thành.
            </p>
          )}

          <section className="card p-4">
            <h3 className="font-display font-semibold text-ink">
              Thời gian học mỗi ngày theo danh mục
            </h3>
            <p className="mb-3 text-xs text-ink-soft">
              Cột màu: thời gian thực tế của buổi hoàn thành · nền xám: thời gian dự kiến
            </p>
            <Legend cats={usedCats} />
            <DailyChart days={stats.byDay} cats={usedCats} catById={catById} period={period} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-4">
              <h3 className="mb-3 font-display font-semibold text-ink">Thời gian theo danh mục</h3>
              <CategoryTimeTable stats={stats} catById={catById} />
            </section>
            <section className="card p-4">
              <h3 className="mb-1 font-display font-semibold text-ink">
                Hoàn thành / không hoàn thành
              </h3>
              <CompletionLegend />
              <CompletionBars stats={stats} catById={catById} />
            </section>
          </div>
        </>
      )}

      {/* luôn hiện, kể cả khi kỳ đang xem trống */}
      <section className="card p-4">
        <h3 className="font-display font-semibold text-ink">
          So sánh {series.length} {unit} gần nhất
        </h3>
        <p className="mb-3 text-xs text-ink-soft">
          Kết thúc ở {unit} đang xem · cột màu: thời gian thực tế theo danh mục · nền xám: dự kiến ·
          bấm vào tên {unit} trong bảng để xem chi tiết
        </p>
        <Legend cats={seriesCats} />
        <PeriodComparison
          series={series}
          period={period}
          current={from}
          cats={seriesCats}
          catById={catById}
          onPick={setAnchor}
        />
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

function Legend({ cats }: { cats: CategoryInfo[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {cats.map((c) => (
        <li key={c.id} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.hex }} />
          {c.name}
        </li>
      ))}
    </ul>
  );
}

/** Mốc trục dọc (phút) tròn giờ, 3-5 vạch. */
function hourTicks(maxMin: number) {
  const maxH = Math.max(1, Math.ceil(maxMin / 60));
  // bước tròn nhỏ nhất cho tối đa 5 vạch
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((n) => maxH / n <= 5) ?? Math.ceil(maxH / 5);
  const top = Math.ceil(maxH / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step * 60);
}

const CHART_H = 200;

type Column = {
  key: string;
  /** nhãn dưới cột */
  label: React.ReactNode;
  /** tiêu đề tooltip */
  title: string;
  /** ẩn nhãn trên màn hẹp (lịch tháng quá nhiều cột) */
  hideLabelOnMobile?: boolean;
  actualByCategory: Map<string, number>;
  actual: number;
  planned: number;
};

/** Cột chồng theo danh mục (thực tế), nền xám = dự kiến; hover xem chi tiết. */
function StackedColumns({
  columns,
  cats,
  catById,
  dense,
}: {
  columns: Column[];
  cats: CategoryInfo[];
  catById: Map<string, CategoryInfo>;
  /** nhiều cột (VD 31 ngày): khe hẹp */
  dense?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const ticks = hourTicks(Math.max(...columns.map((c) => Math.max(c.planned, c.actual)), 60));
  const max = ticks[ticks.length - 1];
  const y = (min: number) => (min / max) * CHART_H;
  const hovered = columns.find((c) => c.key === hover);
  const gap = dense ? 'gap-0.5' : 'gap-1 sm:gap-3 sm:px-2';

  return (
    <div className="relative pt-3">
      <div className="flex">
        {/* trục giờ */}
        <div className="relative w-9 shrink-0" style={{ height: CHART_H }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-faint"
              style={{ bottom: y(t) }}
            >
              {t / 60}h
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className={`relative flex items-end ${gap}`} style={{ height: CHART_H }}>
            {/* lưới (cùng hệ toạ độ với cột) */}
            {ticks.map((t) => (
              <div
                key={t}
                className={`pointer-events-none absolute inset-x-0 border-t ${
                  t === 0 ? 'border-line' : 'border-line/50'
                }`}
                style={{ bottom: y(t) }}
              />
            ))}
            {columns.map((col) => (
              <button
                key={col.key}
                type="button"
                onMouseEnter={() => setHover(col.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(col.key)}
                onBlur={() => setHover(null)}
                aria-label={`${col.title}: thực tế ${formatDuration(col.actual)}, dự kiến ${formatDuration(col.planned)}`}
                className={`relative flex h-full min-w-0 flex-1 items-end justify-center ${
                  hover === col.key ? 'bg-paper' : ''
                }`}
              >
                {/* dự kiến */}
                {col.planned > 0 && (
                  <span
                    className="absolute bottom-0 w-full max-w-10 rounded-t bg-line/70"
                    style={{ height: y(col.planned) }}
                  />
                )}
                {/* thực tế, chồng theo danh mục (thứ tự cố định), khe 2px giữa các đoạn */}
                <span
                  className="relative flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t"
                  style={{ height: y(col.actual) }}
                >
                  {cats.map((c) => {
                    const v = col.actualByCategory.get(c.id);
                    if (!v) return null;
                    return (
                      <span
                        key={c.id}
                        className="block w-full shrink-0 border-t-2 border-surface first:border-t-0"
                        style={{ height: y(v), backgroundColor: c.hex }}
                      />
                    );
                  })}
                </span>
              </button>
            ))}
          </div>
          {/* nhãn cột */}
          <div className={`flex ${gap}`}>
            {columns.map((col) => (
              <span
                key={col.key}
                className={`min-w-0 flex-1 overflow-hidden pt-1 text-center text-[10px] text-ink-faint ${
                  col.hideLabelOnMobile ? 'invisible sm:visible' : ''
                }`}
              >
                {col.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hovered && (hovered.planned > 0 || hovered.actual > 0) && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 min-w-44 rounded-lg border border-line bg-surface p-2.5 text-xs shadow-lift">
          <p className="mb-1 font-semibold text-ink">{hovered.title}</p>
          {cats
            .filter((c) => hovered.actualByCategory.get(c.id))
            .map((c) => (
              <p key={c.id} className="flex items-center justify-between gap-3 text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: c.hex }} />
                  {catById.get(c.id)?.name}
                </span>
                <span className="font-medium text-ink">
                  {shortDuration(hovered.actualByCategory.get(c.id)!)}
                </span>
              </p>
            ))}
          <p className="mt-1 flex justify-between gap-3 border-t border-line pt-1 text-ink-soft">
            <span>Thực tế / dự kiến</span>
            <span className="font-medium text-ink">
              {shortDuration(hovered.actual)} / {shortDuration(hovered.planned)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Cột theo từng ngày của kỳ đang xem. */
function DailyChart({
  days,
  cats,
  catById,
  period,
}: {
  days: DayStat[];
  cats: CategoryInfo[];
  catById: Map<string, CategoryInfo>;
  period: Period;
}) {
  const columns: Column[] = days.map((d) => {
    const day = Number(d.date.slice(8));
    return {
      key: d.date,
      title: formatDate(d.date),
      label:
        period === 'week' ? (
          <>
            <span className="block font-medium text-ink-soft">
              {WEEKDAY_SHORT[weekdayOf(d.date)]}
            </span>
            {formatDayMonth(d.date)}
          </>
        ) : (
          day
        ),
      hideLabelOnMobile: period === 'month' && day !== 1 && day % 5 !== 0,
      actualByCategory: d.actualByCategory,
      actual: d.actual,
      planned: d.planned,
    };
  });
  return (
    <StackedColumns columns={columns} cats={cats} catById={catById} dense={period === 'month'} />
  );
}

/** Nhãn ngắn của một kỳ: 'T21/09' cho tuần, 'Th9/26' cho tháng */
function periodLabel(period: Period, from: string) {
  return period === 'week'
    ? formatDayMonth(from)
    : `Th${Number(from.slice(5, 7))}/${from.slice(2, 4)}`;
}

function periodTitle(period: Period, from: string, to: string) {
  return period === 'week'
    ? `${formatDate(from, false)} - ${formatDate(to, false)}`
    : `Tháng ${Number(from.slice(5, 7))}/${from.slice(0, 4)}`;
}

/**
 * So sánh các tuần / tháng gần nhau (kết thúc ở kỳ đang xem): cột chồng theo
 * danh mục + bảng thực tế, dự kiến, tỷ lệ hoàn thành và thay đổi so với kỳ trước.
 */
function PeriodComparison({
  series,
  period,
  current,
  cats,
  catById,
  onPick,
}: {
  series: PeriodStats[];
  period: Period;
  /** from của kỳ đang xem (tô đậm) */
  current: string;
  cats: CategoryInfo[];
  catById: Map<string, CategoryInfo>;
  onPick: (from: string) => void;
}) {
  const columns: Column[] = series.map((p) => {
    const byCat = new Map<string, number>();
    for (const c of p.byCategory) if (c.actual) byCat.set(c.categoryId, c.actual);
    return {
      key: p.from,
      title: periodTitle(period, p.from, p.to),
      label: (
        <span className={p.from === current ? 'font-semibold text-ink' : ''}>
          {periodLabel(period, p.from)}
        </span>
      ),
      actualByCategory: byCat,
      actual: p.actual,
      planned: p.planned,
    };
  });

  return (
    <>
      <StackedColumns columns={columns} cats={cats} catById={catById} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint">
              <th className="pb-2 font-medium">{period === 'week' ? 'Tuần' : 'Tháng'}</th>
              <th className="pb-2 text-right font-medium">Thực tế</th>
              <th className="pb-2 text-right font-medium">Dự kiến</th>
              <th className="pb-2 text-right font-medium">Đạt</th>
              <th className="pb-2 pl-4 font-medium">Hoàn thành</th>
              <th className="pb-2 text-right font-medium">So với kỳ trước</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((p) => {
              const i = series.indexOf(p);
              const prev = i > 0 ? series[i - 1] : null;
              const marked = p.completed + p.notCompleted;
              const delta = prev ? p.actual - prev.actual : null;
              const rate = pct(p.completed, marked);
              return (
                <tr
                  key={p.from}
                  className={`border-t border-line ${p.from === current ? 'bg-paper' : ''}`}
                >
                  <td className="py-1.5 pr-3">
                    <button
                      type="button"
                      onClick={() => onPick(p.from)}
                      className="text-left font-medium text-brand hover:underline"
                    >
                      {periodTitle(period, p.from, p.to)}
                    </button>
                  </td>
                  <td className="py-1.5 text-right text-ink">{shortDuration(p.actual)}</td>
                  <td className="py-1.5 text-right text-ink-soft">{shortDuration(p.planned)}</td>
                  <td className="py-1.5 text-right text-ink">
                    {p.planned ? `${pct(p.actual, p.planned)}%` : '-'}
                  </td>
                  <td className="py-1.5 pl-4">
                    {marked ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded bg-danger/80">
                          <span className="block h-full bg-success" style={{ width: `${rate}%` }} />
                        </span>
                        <span className="text-xs text-ink-soft">
                          {rate}% ({p.completed}/{marked})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-ink-faint">Chưa đánh dấu</span>
                    )}
                  </td>
                  <td
                    className={`py-1.5 text-right ${
                      delta == null || delta === 0
                        ? 'text-ink-faint'
                        : delta > 0
                          ? 'text-success'
                          : 'text-danger'
                    }`}
                  >
                    {delta == null
                      ? '-'
                      : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ -' : ''}${shortDuration(Math.abs(delta))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Bảng danh mục: thanh thực tế trên nền dự kiến + tỷ trọng thời gian. */
function CategoryTimeTable({
  stats,
  catById,
}: {
  stats: PeriodStats;
  catById: Map<string, CategoryInfo>;
}) {
  const max = Math.max(...stats.byCategory.map((c) => Math.max(c.planned, c.actual)), 1);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-faint">
          <th className="pb-2 font-medium">Danh mục</th>
          <th className="pb-2 font-medium">Thực tế / dự kiến</th>
          <th className="pb-2 text-right font-medium">Tỷ trọng</th>
        </tr>
      </thead>
      <tbody>
        {stats.byCategory.map((c) => {
          const info = catById.get(c.categoryId);
          return (
            <tr key={c.categoryId} className="align-top">
              <td className="py-1.5 pr-3">
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: info?.hex }}
                  />
                  {info?.name ?? 'Danh mục đã xoá'}
                </span>
              </td>
              <td className="w-1/2 py-1.5 pr-3">
                <div className="relative h-2.5 rounded bg-paper">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-line"
                    style={{ width: `${(c.planned / max) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ width: `${(c.actual / max) * 100}%`, backgroundColor: info?.hex }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {shortDuration(c.actual)} / {shortDuration(c.planned)}
                </p>
              </td>
              <td className="py-1.5 text-right text-ink">{pct(c.actual, stats.actual)}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const COMPLETION_PARTS = [
  { key: 'completed', label: 'Hoàn thành', cls: 'bg-success' },
  { key: 'notCompleted', label: 'Không hoàn thành', cls: 'bg-danger' },
  { key: 'unmarked', label: 'Chưa đánh dấu', cls: 'bg-line' },
] as const;

function CompletionLegend() {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {COMPLETION_PARTS.map((p) => (
        <li key={p.key} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`h-2.5 w-2.5 rounded-sm ${p.cls}`} />
          {p.label}
        </li>
      ))}
    </ul>
  );
}

/** Thanh 100% cho tổng và từng danh mục: hoàn thành / không / chưa đánh dấu. */
function CompletionBars({
  stats,
  catById,
}: {
  stats: PeriodStats;
  catById: Map<string, CategoryInfo>;
}) {
  const rows = [
    {
      id: 'all',
      name: 'Tất cả',
      hex: null as string | null,
      completed: stats.completed,
      notCompleted: stats.notCompleted,
      unmarked: stats.unmarkedPast + stats.upcoming,
    },
    ...stats.byCategory.map((c) => ({
      id: c.categoryId,
      name: catById.get(c.categoryId)?.name ?? 'Danh mục đã xoá',
      hex: catById.get(c.categoryId)?.hex ?? null,
      completed: c.completed,
      notCompleted: c.notCompleted,
      unmarked: c.unmarked,
    })),
  ];
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const total = r.completed + r.notCompleted + r.unmarked;
        return (
          <li key={r.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span
                className={`inline-flex items-center gap-1.5 ${r.hex ? 'text-ink' : 'font-semibold text-ink'}`}
              >
                {r.hex && (
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.hex }} />
                )}
                {r.name}
              </span>
              <span className="text-xs text-ink-soft">
                {r.completed}/{total} buổi · {pct(r.completed, r.completed + r.notCompleted)}% hoàn
                thành
              </span>
            </div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded">
              {COMPLETION_PARTS.map((p) =>
                r[p.key] ? (
                  <span
                    key={p.key}
                    className={p.cls}
                    style={{ width: `${(r[p.key] / total) * 100}%` }}
                    title={`${p.label}: ${r[p.key]} buổi`}
                  />
                ) : null
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
