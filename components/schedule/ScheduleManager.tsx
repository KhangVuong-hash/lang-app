'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SimpleSelect from '@/components/ui/SimpleSelect';
import Spinner from '@/components/ui/Spinner';
import TimePicker from '@/components/ui/TimePicker';
import ConfirmButton from '@/components/ui/ConfirmButton';
import MonthView, { RULE_COLORS } from '@/components/schedule/MonthView';
import DayView from '@/components/schedule/DayView';
import {
  WEEKDAY_SHORT,
  WEEK_ORDER,
  addDays,
  describeRange,
  describeRule,
  expandOccurrences,
  formatDate,
  formatDuration,
  hhmm,
  minutesBetween,
  mondayOf,
  nowLocalTime,
  todayLocal,
  weekdayOf,
  type Occurrence,
  type ScheduleException,
  type ScheduleRule,
} from '@/lib/schedule';

type RuleDialogState = {
  rule?: ScheduleRule;
  date?: string;
  time?: string;
} | null;

/** màu cố định theo id lịch (không đổi khi sửa ngày/giờ) */
function colorOf(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RULE_COLORS[h % RULE_COLORS.length];
}

/**
 * Thời khóa biểu tự học: sidebar thống kê hôm nay / tuần / tháng + lịch tháng.
 * Thêm/sửa/xoá lịch, huỷ/dời từng buổi (hộp thoại hoặc kéo-thả trên lịch).
 */
export default function ScheduleManager({
  rules: serverRules,
  exceptions: serverExceptions,
}: {
  rules: ScheduleRule[];
  exceptions: ScheduleException[];
}) {
  const router = useRouter();
  const supabase = createClient();
  // bản sao cục bộ để kéo-thả cập nhật ngay, đồng bộ lại mỗi khi server refresh
  const [rules, setRules] = useState(serverRules);
  const [exceptions, setExceptions] = useState(serverExceptions);
  useEffect(() => setRules(serverRules), [serverRules]);
  useEffect(() => setExceptions(serverExceptions), [serverExceptions]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [ruleDialog, setRuleDialog] = useState<RuleDialogState>(null);
  const [occurrence, setOccurrence] = useState<Occurrence | null>(null);
  const [view, setView] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(() => todayLocal().slice(0, 7));
  const [day, setDay] = useState(() => todayLocal());
  const [focusId, setFocusId] = useState<string | null>(null);

  // giờ hiện tại chỉ tính ở client (tránh lệch khi hydrate), cập nhật mỗi phút
  const [now, setNow] = useState<{ date: string; time: string } | null>(null);
  useEffect(() => {
    const tick = () => setNow({ date: todayLocal(), time: nowLocalTime() });
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const today = now?.date ?? todayLocal();
  const stats = useMemo(() => {
    const active = (from: string, to: string) =>
      expandOccurrences(rules, exceptions, from, to).filter((o) => o.status !== 'cancelled');
    const sum = (list: Occurrence[]) =>
      list.reduce((n, o) => n + minutesBetween(o.start, o.end), 0);
    const monday = mondayOf(today);
    const [y, m] = today.split('-').map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

    const todayAll = expandOccurrences(rules, exceptions, today, today);
    const todayActive = todayAll.filter((o) => o.status !== 'cancelled');
    const week = active(monday, addDays(monday, 6));
    const monthList = active(`${today.slice(0, 7)}-01`, monthEnd);
    const upcoming = active(addDays(today, 1), addDays(today, 60))[0] ?? null;
    return {
      todayAll,
      todayMinutes: sum(todayActive),
      todayCount: todayActive.length,
      weekCount: week.length,
      weekMinutes: sum(week),
      monthCount: monthList.length,
      upcoming,
    };
  }, [rules, exceptions, today]);

  const statusOf = (o: Occurrence) => {
    if (o.status === 'cancelled') return { label: 'Đã huỷ', cls: 'bg-danger/10 text-danger' };
    if (!now) return null;
    if (now.time >= o.end) return { label: 'Đã xong', cls: 'bg-success/10 text-success' };
    if (now.time >= o.start) return { label: 'Đang học', cls: 'bg-highlight-soft text-ink' };
    return {
      label: 'Sắp tới',
      cls: 'bg-skill-listening/10 text-skill-listening',
    };
  };

  /**
   * Kéo-thả buổi học sang ngày khác:
   *  - buổi đơn lẻ (chưa có ngoại lệ) -> đổi luôn ngày của lịch
   *  - buổi của lịch lặp -> tạo/cập nhật ngoại lệ "dời"; thả về đúng ngày gốc -> khôi phục
   */
  async function moveOccurrence(o: Occurrence, date: string) {
    setMoveError(null);
    const ex = o.exception;
    let error: { message: string } | null = null;

    if (!ex && o.rule.starts_on === o.rule.ends_on) {
      const patch = {
        starts_on: date,
        ends_on: date,
        weekdays: [weekdayOf(date)],
      };
      setRules((rs) => rs.map((r) => (r.id === o.rule.id ? { ...r, ...patch } : r)));
      ({ error } = await supabase.from('study_schedules').update(patch).eq('id', o.rule.id));
    } else if (ex && date === o.originalDate) {
      setExceptions((xs) => xs.filter((x) => x.id !== ex.id));
      ({ error } = await supabase.from('study_schedule_exceptions').delete().eq('id', ex.id));
    } else {
      const row = {
        schedule_id: o.rule.id,
        occurs_on: o.originalDate,
        status: 'rescheduled' as const,
        new_date: date,
        new_start_time: o.start,
        new_end_time: o.end,
        note: ex?.note ?? null,
      };
      setExceptions((xs) => [
        ...xs.filter((x) => !(x.schedule_id === o.rule.id && x.occurs_on === o.originalDate)),
        { id: ex?.id ?? `tmp-${o.key}`, ...row },
      ]);
      ({ error } = await supabase
        .from('study_schedule_exceptions')
        .upsert(row, { onConflict: 'schedule_id,occurs_on' }));
    }

    if (error) {
      setMoveError(error.message);
      setRules(serverRules);
      setExceptions(serverExceptions);
      return;
    }
    router.refresh();
  }

  async function removeRule(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('study_schedules')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', id);
    if (error) return error.message;
    setRuleDialog(null);
    if (focusId === id) setFocusId(null);
    router.refresh();
  }

  const focused = rules.find((r) => r.id === focusId) ?? null;

  const toolbar = (
    <>
      {focused && (
        <button onClick={() => setFocusId(null)} className="btn-ghost btn-sm">
          Bỏ chọn “{focused.title || 'Tự học'}”
        </button>
      )}
      <div className="inline-flex rounded-lg border border-line p-0.5">
        {(
          [
            { v: 'month', label: 'Tháng' },
            { v: 'day', label: 'Ngày' },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setView(o.v)}
            aria-pressed={view === o.v}
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              view === o.v ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button onClick={() => setRuleDialog({})} className="btn-primary btn-sm">
        <CalendarPlus className="h-4 w-4" />
        Thêm lịch
      </button>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="card p-4">
          <p className="text-xs font-medium text-ink-faint">Hôm nay · {formatDate(today)}</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">
            {stats.todayCount}
            <span className="ml-1.5 text-base font-semibold text-ink-soft">buổi học</span>
          </p>
          <p className="text-sm text-ink-soft">
            {stats.todayCount ? `Tổng ${formatDuration(stats.todayMinutes)}` : 'Hôm nay bạn rảnh'}
          </p>

          <h3 className="mb-2 mt-4 text-sm font-semibold text-ink">Việc cần làm hôm nay</h3>
          {stats.todayAll.length === 0 ? (
            <p className="text-sm text-ink-faint">Không có buổi học nào.</p>
          ) : (
            <ul className="space-y-1">
              {stats.todayAll.map((o) => {
                const st = statusOf(o);
                const done = st?.label === 'Đã xong' || o.status === 'cancelled';
                return (
                  <li key={o.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusId(o.rule.id);
                        setMonth(today.slice(0, 7));
                        setDay(today);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-paper ${
                        o.rule.id === focusId ? 'bg-brand/10' : ''
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colorOf(o.rule.id).split(' ')[0]}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            done ? 'text-ink-faint line-through' : 'text-ink'
                          }`}
                        >
                          {o.rule.title || 'Tự học'}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {o.start}-{o.end}
                          {o.rule.location && ` · ${o.rule.location}`}
                        </span>
                      </span>
                      {st && <span className={`pill shrink-0 ${st.cls}`}>{st.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card grid grid-cols-2 divide-x divide-line p-0">
          <div className="p-4">
            <p className="text-xs font-medium text-ink-faint">Tuần này</p>
            <p className="font-display text-xl font-bold text-ink">{stats.weekCount} buổi</p>
            <p className="text-xs text-ink-soft">{formatDuration(stats.weekMinutes)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-ink-faint">Tháng này</p>
            <p className="font-display text-xl font-bold text-ink">{stats.monthCount} buổi</p>
            <p className="text-xs text-ink-soft">{rules.length} lịch đang có</p>
          </div>
        </section>

        {stats.upcoming && (
          <button
            type="button"
            onClick={() => {
              setFocusId(stats.upcoming!.rule.id);
              setMonth(stats.upcoming!.date.slice(0, 7));
              setDay(stats.upcoming!.date);
            }}
            className="card block w-full p-4 text-left hover:bg-paper"
          >
            <p className="text-xs font-medium text-ink-faint">Buổi tiếp theo</p>
            <p className="text-sm font-semibold text-ink">
              {stats.upcoming.rule.title || 'Tự học'}
            </p>
            <p className="text-xs text-ink-soft">
              {formatDate(stats.upcoming.date)} · {stats.upcoming.start}-{stats.upcoming.end}
            </p>
          </button>
        )}
      </aside>

      <section className="card min-w-0 p-4">
        {view === 'month' ? (
          <MonthView
            month={month}
            onMonthChange={setMonth}
            rules={rules}
            exceptions={exceptions}
            colorOf={colorOf}
            focusId={focusId}
            onSelect={setOccurrence}
            onDayClick={(date) => {
              setDay(date);
              setView('day');
            }}
            onMove={moveOccurrence}
            toolbar={toolbar}
          />
        ) : (
          <DayView
            date={day}
            onDateChange={(date) => {
              setDay(date);
              setMonth(date.slice(0, 7));
            }}
            rules={rules}
            exceptions={exceptions}
            colorOf={colorOf}
            focusId={focusId}
            now={now}
            onSelect={setOccurrence}
            onSlotClick={(date, time) => setRuleDialog({ date, time })}
            toolbar={toolbar}
          />
        )}
        {moveError && <p className="mt-2 text-sm text-danger">{moveError}</p>}
        <p className="mt-3 text-xs text-ink-faint">
          {view === 'month'
            ? 'Bấm vào một ngày để xem theo giờ. Bấm vào một buổi để huỷ/dời hoặc sửa cả lịch; có thể kéo thả buổi học sang ngày khác.'
            : 'Bấm vào ô giờ trống để thêm buổi học bắt đầu từ giờ đó. Các buổi trùng giờ hiển thị cạnh nhau.'}
        </p>
      </section>

      <Dialog open={!!ruleDialog} onOpenChange={(o) => !o && setRuleDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="mb-4 pr-8 font-display text-lg font-semibold text-ink">
            {ruleDialog?.rule ? 'Sửa lịch học' : 'Thêm lịch học'}
          </DialogTitle>
          {ruleDialog && (
            <RuleForm
              key={ruleDialog.rule?.id ?? 'new'}
              rule={ruleDialog.rule}
              defaultDate={ruleDialog.date}
              defaultTime={ruleDialog.time}
              onDelete={removeRule}
              onDone={() => {
                setRuleDialog(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!occurrence} onOpenChange={(o) => !o && setOccurrence(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle className="mb-1 pr-8 font-display text-lg font-semibold text-ink">
            Buổi học {formatDate(occurrence?.originalDate ?? todayLocal())}
          </DialogTitle>
          {occurrence && (
            <OccurrenceForm
              key={occurrence.key}
              occurrence={occurrence}
              onEditRule={() => {
                const rule = occurrence.rule;
                setOccurrence(null);
                setRuleDialog({ rule });
              }}
              onDone={() => {
                setOccurrence(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleForm({
  rule,
  defaultDate,
  defaultTime,
  onDelete,
  onDone,
}: {
  rule?: ScheduleRule;
  /** ngày được bấm trên lịch tháng (khi thêm mới) */
  defaultDate?: string;
  /** giờ bắt đầu được bấm trên lịch ngày (khi thêm mới), dạng 'HH:MM' */
  defaultTime?: string;
  /** trả về thông báo lỗi nếu xoá thất bại */
  onDelete: (id: string) => Promise<string | undefined>;
  onDone: () => void;
}) {
  const supabase = createClient();
  const today = defaultDate ?? todayLocal();
  const [once, setOnce] = useState(rule ? rule.ends_on === rule.starts_on : true);
  const [title, setTitle] = useState(rule?.title ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(rule?.weekdays ?? [weekdayOf(today)]);
  const [start, setStart] = useState(rule ? hhmm(rule.start_time) : (defaultTime ?? '19:00'));
  const [end, setEnd] = useState(() => {
    if (rule) return hhmm(rule.end_time);
    if (!defaultTime) return '20:30';
    // mặc định 1 giờ, không vượt quá 23:59
    const min = Math.min(
      Number(defaultTime.slice(0, 2)) * 60 + Number(defaultTime.slice(3, 5)) + 60,
      23 * 60 + 59
    );
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  });
  const [startsOn, setStartsOn] = useState(rule?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(rule && !once ? (rule.ends_on ?? '') : '');
  const [intervalWeeks, setIntervalWeeks] = useState(String(rule?.interval_weeks ?? 1));
  const [location, setLocation] = useState(rule?.location ?? '');
  const [note, setNote] = useState(rule?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (end <= start) return setError('Giờ kết thúc phải sau giờ bắt đầu.');
    if (!once && weekdays.length === 0) return setError('Chọn ít nhất một ngày trong tuần.');
    if (!once && endsOn && endsOn < startsOn)
      return setError('Ngày kết thúc phải sau ngày bắt đầu.');

    const payload = {
      title: title.trim() || null,
      weekdays: once ? [weekdayOf(startsOn)] : [...weekdays].sort(),
      start_time: start,
      end_time: end,
      starts_on: startsOn,
      ends_on: once ? startsOn : endsOn || null,
      interval_weeks: once ? 1 : Number(intervalWeeks),
      location: location.trim() || null,
      note: note.trim() || null,
    };

    setSaving(true);
    const { error } = rule
      ? await supabase.from('study_schedules').update(payload).eq('id', rule.id)
      : await supabase.from('study_schedules').insert(payload);
    setSaving(false);
    if (error) return setError(error.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="inline-flex rounded-lg border border-line p-0.5">
        {[
          { v: true, label: 'Một buổi' },
          { v: false, label: 'Lặp hằng tuần' },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setOnce(o.v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              once === o.v ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div>
        <label className="field-label">Tiêu đề (tuỳ chọn)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="VD: Luyện nói, Ôn thi N4…"
        />
      </div>

      {!once && (
        <div>
          <label className="field-label">Các ngày trong tuần</label>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => {
              const on = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={`h-9 w-11 rounded-lg border text-sm font-semibold ${
                    on
                      ? 'border-brand bg-brand text-white'
                      : 'border-line text-ink-soft hover:bg-paper'
                  }`}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Bắt đầu</label>
          <TimePicker value={start} onChange={setStart} aria-label="Giờ bắt đầu" />
        </div>
        <div>
          <label className="field-label">Kết thúc</label>
          <TimePicker value={end} onChange={setEnd} aria-label="Giờ kết thúc" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={once ? 'col-span-2' : ''}>
          <label className="field-label">{once ? 'Ngày học' : 'Từ ngày'}</label>
          <input
            type="date"
            required
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            className="input"
          />
        </div>
        {!once && (
          <div>
            <label className="field-label">Đến ngày (tuỳ chọn)</label>
            <input
              type="date"
              value={endsOn}
              min={startsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="input"
            />
          </div>
        )}
      </div>

      {!once && (
        <div>
          <label className="field-label">Lặp lại</label>
          <SimpleSelect
            value={intervalWeeks}
            onChange={setIntervalWeeks}
            options={[
              { value: '1', label: 'Mỗi tuần' },
              { value: '2', label: 'Mỗi 2 tuần' },
              { value: '3', label: 'Mỗi 3 tuần' },
              { value: '4', label: 'Mỗi 4 tuần' },
            ]}
          />
        </div>
      )}

      <div>
        <label className="field-label">Địa điểm / link học (tuỳ chọn)</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input"
          placeholder="VD: Phòng 203 hoặc link Google Meet"
        />
      </div>

      <div>
        <label className="field-label">Ghi chú</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="textarea"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button disabled={saving} className="btn-primary">
          {saving && <Spinner />}
          {saving ? 'Đang lưu…' : rule ? 'Lưu thay đổi' : 'Thêm lịch'}
        </button>
        {rule && (
          <ConfirmButton
            onConfirm={async () => {
              const msg = await onDelete(rule.id);
              if (msg) setError(msg);
            }}
            question="Xoá lịch này và mọi buổi của nó?"
            confirmLabel="Xoá"
          >
            Xoá lịch
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}

function OccurrenceForm({
  occurrence,
  onEditRule,
  onDone,
}: {
  occurrence: Occurrence;
  onEditRule: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const ex = occurrence.exception;
  const [mode, setMode] = useState<'cancel' | 'move'>(
    ex?.status === 'rescheduled' ? 'move' : 'cancel'
  );
  const [date, setDate] = useState(occurrence.date);
  const [start, setStart] = useState(occurrence.start);
  const [end, setEnd] = useState(occurrence.end);
  const [note, setNote] = useState(ex?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (mode === 'move' && end <= start) return setError('Giờ kết thúc phải sau giờ bắt đầu.');
    setSaving(true);
    const { error } = await supabase.from('study_schedule_exceptions').upsert(
      {
        schedule_id: occurrence.rule.id,
        occurs_on: occurrence.originalDate,
        status: mode === 'cancel' ? 'cancelled' : 'rescheduled',
        new_date: mode === 'move' ? date : null,
        new_start_time: mode === 'move' ? start : null,
        new_end_time: mode === 'move' ? end : null,
        note: note.trim() || null,
      },
      { onConflict: 'schedule_id,occurs_on' }
    );
    setSaving(false);
    if (error) return setError(error.message);
    onDone();
  }

  async function restore() {
    if (!ex) return;
    const { error } = await supabase.from('study_schedule_exceptions').delete().eq('id', ex.id);
    if (error) return setError(error.message);
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-sm text-ink-soft">
          <p>
            {occurrence.rule.title ? `${occurrence.rule.title} · ` : ''}
            {describeRule(occurrence.rule)}
          </p>
          <p className="text-xs text-ink-faint">{describeRange(occurrence.rule)}</p>
        </div>
        <button
          type="button"
          onClick={onEditRule}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" />
          Sửa / xoá cả lịch
        </button>
      </div>

      {ex && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-highlight-soft/60 px-3 py-2 text-sm">
          <span>
            {ex.status === 'cancelled'
              ? 'Buổi này đang bị huỷ.'
              : `Đã dời sang ${formatDate(occurrence.date)}, ${occurrence.start}-${occurrence.end}.`}
          </span>
          <ConfirmButton
            onConfirm={restore}
            question="Trả về lịch gốc?"
            confirmLabel="Khôi phục"
            className="text-sm font-medium text-brand hover:underline"
          >
            Khôi phục lịch gốc
          </ConfirmButton>
        </div>
      )}

      <div className="inline-flex rounded-lg border border-line p-0.5">
        {(
          [
            { v: 'cancel', label: 'Huỷ buổi' },
            { v: 'move', label: 'Dời buổi' },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setMode(o.v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === o.v ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {mode === 'move' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="field-label">Ngày mới</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="col-span-3 grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Bắt đầu</label>
              <TimePicker value={start} onChange={setStart} aria-label="Giờ bắt đầu" />
            </div>
            <div>
              <label className="field-label">Kết thúc</label>
              <TimePicker value={end} onChange={setEnd} aria-label="Giờ kết thúc" />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="field-label">Lý do / ghi chú (tuỳ chọn)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          placeholder={mode === 'cancel' ? 'VD: Nghỉ lễ' : 'VD: Bận việc đột xuất'}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving && <Spinner />}
        {mode === 'cancel' ? 'Huỷ buổi này' : 'Dời buổi này'}
      </button>
    </div>
  );
}
