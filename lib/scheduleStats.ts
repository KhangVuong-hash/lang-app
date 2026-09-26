/**
 * Thống kê thời khóa biểu tự học theo tuần / tháng: gom các buổi (đã sinh từ
 * quy tắc) theo danh mục, theo ngày và theo kết quả (hoàn thành / không / chưa
 * đánh dấu). Thời gian "thực tế" chỉ tính buổi đã đánh dấu hoàn thành.
 */
import {
  addDays,
  expandOccurrences,
  logKey,
  minutesBetween,
  mondayOf,
  type ScheduleException,
  type ScheduleRule,
  type SessionLog,
} from '@/lib/schedule';

export type Period = 'week' | 'month';

/** id danh mục; buổi chưa phân loại dùng khoá này */
export const NO_CATEGORY = '__none__';

export type CategoryStat = {
  categoryId: string;
  /** số phút dự kiến (buổi không bị huỷ) */
  planned: number;
  /** số phút học thực tế (buổi hoàn thành) */
  actual: number;
  completed: number;
  notCompleted: number;
  unmarked: number;
};

export type DayStat = {
  date: string;
  /** số phút thực tế theo danh mục */
  actualByCategory: Map<string, number>;
  actual: number;
  planned: number;
};

export type PeriodStats = {
  from: string;
  to: string;
  planned: number;
  actual: number;
  sessions: number;
  completed: number;
  notCompleted: number;
  /** buổi đã qua (hoặc hôm nay) mà chưa đánh dấu */
  unmarkedPast: number;
  /** buổi sắp tới, chưa đánh dấu */
  upcoming: number;
  cancelled: number;
  byCategory: CategoryStat[];
  byDay: DayStat[];
};

/** Khoảng ngày của kỳ chứa `anchor`: tuần T2-CN hoặc cả tháng. */
export function periodRange(period: Period, anchor: string) {
  if (period === 'week') {
    const from = mondayOf(anchor);
    return { from, to: addDays(from, 6) };
  }
  const [y, m] = anchor.split('-').map(Number);
  return {
    from: `${anchor.slice(0, 7)}-01`,
    to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
}

/** Ngày neo của kỳ trước / sau (`step` = -1 / 1). */
export function shiftPeriod(period: Period, anchor: string, step: number) {
  if (period === 'week') return addDays(mondayOf(anchor), 7 * step);
  const [y, m] = anchor.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + step, 1)).toISOString().slice(0, 10);
}

export function computeStats(
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
  logs: SessionLog[],
  from: string,
  to: string,
  today: string
): PeriodStats {
  const logByKey = new Map(logs.map((l) => [logKey(l), l]));
  const cats = new Map<string, CategoryStat>();
  const days = new Map<string, DayStat>();
  for (let d = from; d <= to; d = addDays(d, 1))
    days.set(d, { date: d, actualByCategory: new Map(), actual: 0, planned: 0 });

  const out: PeriodStats = {
    from,
    to,
    planned: 0,
    actual: 0,
    sessions: 0,
    completed: 0,
    notCompleted: 0,
    unmarkedPast: 0,
    upcoming: 0,
    cancelled: 0,
    byCategory: [],
    byDay: [],
  };

  for (const o of expandOccurrences(rules, exceptions, from, to)) {
    if (o.status === 'cancelled') {
      out.cancelled++;
      continue;
    }
    const catId = o.rule.category_id ?? NO_CATEGORY;
    let cat = cats.get(catId);
    if (!cat) {
      cat = {
        categoryId: catId,
        planned: 0,
        actual: 0,
        completed: 0,
        notCompleted: 0,
        unmarked: 0,
      };
      cats.set(catId, cat);
    }
    const day = days.get(o.date)!;
    const planned = minutesBetween(o.start, o.end);
    const log = logByKey.get(o.key);

    out.sessions++;
    out.planned += planned;
    cat.planned += planned;
    day.planned += planned;

    if (log?.completed) {
      const actual = log.actual_minutes ?? planned;
      out.completed++;
      out.actual += actual;
      cat.completed++;
      cat.actual += actual;
      day.actual += actual;
      day.actualByCategory.set(catId, (day.actualByCategory.get(catId) ?? 0) + actual);
    } else if (log) {
      out.notCompleted++;
      cat.notCompleted++;
    } else {
      cat.unmarked++;
      if (o.date <= today) out.unmarkedPast++;
      else out.upcoming++;
    }
  }

  out.byCategory = [...cats.values()].sort((a, b) => b.planned - a.planned);
  out.byDay = [...days.values()];
  return out;
}
