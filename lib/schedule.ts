/**
 * Thời khóa biểu tự học: sinh các buổi học cụ thể từ quy tắc `study_schedules`
 * + ngoại lệ `study_schedule_exceptions`. Ngày luôn là chuỗi 'YYYY-MM-DD'
 * (giờ địa phương của lớp), tính toán bằng UTC để không lệch múi giờ.
 */

export type ScheduleRule = {
  id: string;
  title: string | null;
  weekdays: number[];
  start_time: string;
  end_time: string;
  starts_on: string;
  ends_on: string | null;
  interval_weeks: number;
  location: string | null;
  note: string | null;
};

export type ScheduleException = {
  id: string;
  schedule_id: string;
  occurs_on: string;
  status: 'cancelled' | 'rescheduled';
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  note: string | null;
};

export type Occurrence = {
  /** khoá duy nhất: scheduleId + ngày gốc */
  key: string;
  rule: ScheduleRule;
  /** ngày gốc theo quy tắc */
  originalDate: string;
  /** ngày thực tế (khác originalDate nếu đã dời) */
  date: string;
  start: string;
  end: string;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
  exception: ScheduleException | null;
};

export const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const WEEKDAY_LONG = [
  'Chủ nhật',
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
];
/** thứ tự hiển thị trong tuần: T2 → CN */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DAY_MS = 86_400_000;

function toUtc(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  return fromUtc(toUtc(date) + n * DAY_MS);
}

export function weekdayOf(date: string) {
  return new Date(toUtc(date)).getUTCDay();
}

/** Thứ hai của tuần chứa `date` */
export function mondayOf(date: string) {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/** Hôm nay theo giờ Việt Nam */
export function todayLocal(timeZone = 'Asia/Ho_Chi_Minh') {
  // en-CA cho ra dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

/** Giờ hiện tại theo giờ Việt Nam, dạng 'HH:MM' */
export function nowLocalTime(timeZone = 'Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
}

/** Số phút giữa hai mốc 'HH:MM' */
export function minutesBetween(start: string, end: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return toMin(end) - toMin(start);
}

/** 90 → '1 giờ 30 phút' */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h && `${h} giờ`, m && `${m} phút`].filter(Boolean).join(' ') || '0 phút';
}

/** '19:00:00' → '19:00' */
export function hhmm(time: string) {
  return time.slice(0, 5);
}

export function formatDate(date: string, withWeekday = true) {
  const [y, m, d] = date.split('-');
  const s = `${d}/${m}/${y}`;
  return withWeekday ? `${WEEKDAY_LONG[weekdayOf(date)]}, ${s}` : s;
}

export function formatDayMonth(date: string) {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

/** Mô tả quy tắc cho người đọc, VD: "T2, T4 · 19:00-20:30 · mỗi 2 tuần" */
export function describeRule(rule: ScheduleRule) {
  const days = WEEK_ORDER.filter((d) => rule.weekdays.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(', ');
  const once = rule.ends_on === rule.starts_on;
  const parts = [
    once ? formatDate(rule.starts_on) : days,
    `${hhmm(rule.start_time)}-${hhmm(rule.end_time)}`,
  ];
  if (!once) parts.push(rule.interval_weeks > 1 ? `mỗi ${rule.interval_weeks} tuần` : 'hằng tuần');
  return parts.join(' · ');
}

export function describeRange(rule: ScheduleRule) {
  if (rule.ends_on === rule.starts_on) return 'Buổi đơn lẻ';
  return rule.ends_on
    ? `Từ ${formatDate(rule.starts_on, false)} đến ${formatDate(rule.ends_on, false)}`
    : `Từ ${formatDate(rule.starts_on, false)} · không có ngày kết thúc`;
}

/** Các ngày gốc của quy tắc nằm trong [from, to] (tính cả hai đầu). */
function ruleDates(rule: ScheduleRule, from: string, to: string) {
  const out: string[] = [];
  // buổi đơn lẻ: chỉ cần ngày nằm trong khoảng, không phụ thuộc weekdays
  if (rule.starts_on === rule.ends_on) {
    if (rule.starts_on >= from && rule.starts_on <= to) out.push(rule.starts_on);
    return out;
  }
  const start = rule.starts_on > from ? rule.starts_on : from;
  const end = rule.ends_on && rule.ends_on < to ? rule.ends_on : to;
  if (start > end) return out;

  const anchor = toUtc(mondayOf(rule.starts_on));
  const interval = Math.max(1, rule.interval_weeks);
  for (let ms = toUtc(start); ms <= toUtc(end); ms += DAY_MS) {
    const date = fromUtc(ms);
    if (!rule.weekdays.includes(new Date(ms).getUTCDay())) continue;
    const week = Math.round((toUtc(mondayOf(date)) - anchor) / (7 * DAY_MS));
    if (week % interval === 0) out.push(date);
  }
  return out;
}

/**
 * Sinh buổi học trong khoảng [from, to]. Buổi bị dời vào khoảng này (dù ngày
 * gốc nằm ngoài) vẫn được tính; buổi bị dời ra ngoài khoảng thì bỏ.
 */
export function expandOccurrences(
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
  from: string,
  to: string
): Occurrence[] {
  const exByKey = new Map(exceptions.map((e) => [`${e.schedule_id}:${e.occurs_on}`, e]));
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const out: Occurrence[] = [];
  const seen = new Set<string>();

  const push = (rule: ScheduleRule, originalDate: string) => {
    const key = `${rule.id}:${originalDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    const ex = exByKey.get(key) ?? null;
    const moved = ex?.status === 'rescheduled';
    const occ: Occurrence = {
      key,
      rule,
      originalDate,
      date: moved ? ex!.new_date! : originalDate,
      start: hhmm(moved ? ex!.new_start_time! : rule.start_time),
      end: hhmm(moved ? ex!.new_end_time! : rule.end_time),
      status: ex ? ex.status : 'scheduled',
      exception: ex,
    };
    if (occ.date >= from && occ.date <= to) out.push(occ);
  };

  for (const rule of rules) {
    for (const d of ruleDates(rule, from, to)) push(rule, d);
  }
  // buổi được dời VÀO khoảng đang xem từ một ngày gốc bên ngoài
  for (const ex of exceptions) {
    if (ex.status !== 'rescheduled' || !ex.new_date) continue;
    if (ex.new_date < from || ex.new_date > to) continue;
    const rule = ruleById.get(ex.schedule_id);
    if (rule && ruleDates(rule, ex.occurs_on, ex.occurs_on).length) push(rule, ex.occurs_on);
  }

  return out.sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
  );
}

/** Buổi học kế tiếp (chưa huỷ) từ hôm nay, tìm trong `lookaheadDays` ngày tới. */
export function nextOccurrence(
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
  today = todayLocal(),
  lookaheadDays = 120
) {
  return (
    expandOccurrences(rules, exceptions, today, addDays(today, lookaheadDays)).find(
      (o) => o.status !== 'cancelled'
    ) ?? null
  );
}

export const SCHEDULE_COLUMNS =
  'id, title, weekdays, start_time, end_time, starts_on, ends_on, interval_weeks, location, note';
export const EXCEPTION_COLUMNS =
  'id, schedule_id, occurs_on, status, new_date, new_start_time, new_end_time, note';
