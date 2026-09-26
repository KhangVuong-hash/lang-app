-- ============================================================
-- Dữ liệu mẫu để review Thời khóa biểu + Thống kê (CHỈ dùng ở local).
--   psql "$DB_URL" -v email=kvuong@gmail.com -f supabase/seeds/study_stats_demo.sql
--
-- Tạo cho user `email`:
--   - 4 danh mục: Học tiếng Anh, Học công nghệ, Học trên lớp, Đọc sách
--   - buổi đơn lẻ từ 5 tuần trước đến 2 tuần sau hôm nay (+ vài buổi chưa phân loại)
--   - kết quả cho buổi đã qua: ~70% hoàn thành (thời gian thực tế lệch dự kiến),
--     ~20% không hoàn thành, còn lại chưa đánh dấu; vài buổi bị huỷ
-- Chạy lại được: xoá dữ liệu mẫu cũ (note = '[demo]' và các danh mục trên) trước.
-- ============================================================

select id as uid from auth.users where email = :'email' \gset

begin;

delete from study_schedules where owner_id = :'uid' and note = '[demo]';
delete from study_categories
where owner_id = :'uid'
  and name in ('Học tiếng Anh', 'Học công nghệ', 'Học trên lớp', 'Đọc sách');

insert into study_categories (owner_id, name, color) values
  (:'uid', 'Học tiếng Anh', 0),
  (:'uid', 'Học công nghệ', 1),
  (:'uid', 'Học trên lớp', 2),
  (:'uid', 'Đọc sách', 3);

-- mẫu lịch trong tuần: (danh mục, tiêu đề, thứ [0=CN], giờ bắt đầu, giờ kết thúc, địa điểm)
create temp table demo_pattern (cat text, title text, dow int, st time, en time, loc text)
  on commit drop;
insert into demo_pattern values
  ('Học tiếng Anh', 'Luyện nghe IELTS', 1, '19:00', '20:30', null),
  ('Học tiếng Anh', 'Speaking club', 3, '19:00', '20:30', 'Google Meet'),
  ('Học tiếng Anh', 'Từ vựng + ngữ pháp', 5, '19:00', '20:00', null),
  ('Học công nghệ', 'Next.js + Supabase', 2, '20:00', '22:00', null),
  ('Học công nghệ', 'Thuật toán', 4, '20:00', '21:30', null),
  ('Học công nghệ', 'Side project', 6, '09:00', '11:30', 'Quán cà phê'),
  ('Học trên lớp', 'Lớp Cấu trúc dữ liệu', 2, '07:30', '09:30', 'Phòng B203'),
  ('Học trên lớp', 'Lớp Mạng máy tính', 4, '07:30', '09:30', 'Phòng C105'),
  ('Đọc sách', 'Đọc sách trước khi ngủ', 0, '21:00', '21:45', null),
  (null, 'Ôn bài tự do', 6, '15:00', '16:00', null);

insert into study_schedules
  (owner_id, title, weekdays, start_time, end_time, starts_on, ends_on, location, note, category_id)
select :'uid', p.title, array[p.dow]::smallint[], p.st, p.en, d::date, d::date, p.loc, '[demo]', c.id
from generate_series(current_date - 35, current_date + 14, interval '1 day') d
join demo_pattern p on p.dow = extract(dow from d)
left join study_categories c on c.owner_id = :'uid' and c.name = p.cat;

-- kết quả cho buổi đã qua (và buổi hôm nay đã kết thúc), cố định seed để lần nào chạy cũng giống nhau
select setseed(0.42);
insert into study_session_logs (schedule_id, owner_id, occurs_on, completed, actual_minutes)
select id, owner_id, starts_on, r < 0.72,
  case when r < 0.72 then
    greatest(10, round(extract(epoch from (end_time - start_time)) / 60 * (0.6 + random() * 0.6))::int)
  end
from (
  select s.*, random() as r
  from study_schedules s
  where s.owner_id = :'uid' and s.note = '[demo]' and s.starts_on < current_date
  order by s.starts_on, s.start_time
) x
where r < 0.92;

-- vài buổi bị huỷ (buổi chưa đánh dấu, ~1/3)
insert into study_schedule_exceptions (schedule_id, owner_id, occurs_on, status, note)
select s.id, s.owner_id, s.starts_on, 'cancelled', 'Bận việc đột xuất'
from study_schedules s
where s.owner_id = :'uid' and s.note = '[demo]' and s.starts_on < current_date
  and not exists (select 1 from study_session_logs l where l.schedule_id = s.id)
  and extract(day from s.starts_on)::int % 3 = 0;

commit;

select c.name, count(s.id) as sessions
from study_categories c
left join study_schedules s on s.category_id = c.id and s.deleted_at is null
where c.owner_id = :'uid'
group by c.name order by c.name;
