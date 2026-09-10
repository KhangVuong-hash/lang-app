import Link from 'next/link';
import MarketingShell from '@/components/layout/MarketingShell';
import SectionHeading from '@/components/ui/SectionHeading';
import SkillIcon from '@/components/ui/SkillIcon';
import { SKILLS, LANGUAGES } from '@/lib/constants';

export default function Landing() {
  return (
    <MarketingShell>
      <Hero />
      <UspBar />
      <SkillsSection />
      <LanguagesBand />
      <TeacherBanner />
      <HowItWorks />
      <Testimonials />
      <FinalCta />
    </MarketingShell>
  );
}

/* ---------------------------------------------------------------- HERO */

function Hero() {
  return (
    <section id="tinh-nang" className="relative overflow-hidden">
      <DottedBackdrop />
      <div className="container-page relative grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Anh · Trung · Nhật · Hàn - học 
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
            Học một ngoại ngữ mới,{' '}
            <span className="mark">từng câu một</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            BanThuApp ghép bạn vào lớp học của một giáo viên thật. Bạn luyện đủ bốn kỹ năng
            Nghe, Nói, Viết, Đọc trên chính những video và bài tập giáo viên giao - và được
            theo dõi tiến độ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">
              Bắt đầu miễn phí
            </Link>
            <Link href="/register" className="btn-secondary">
              Tôi là giáo viên
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-faint">
            <span>Đang hỗ trợ:</span>
            {LANGUAGES.map((l) => (
              <span key={l.code} className="inline-flex items-center gap-1.5">
                <span aria-hidden>{l.flag}</span>
                {l.native}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <ScriptCardMock />
        </div>
      </div>
    </section>
  );
}

function DottedBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: 'radial-gradient(#c9d5d2 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
        }}
      />
      <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-highlight/20 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-skill-listening/10 blur-3xl" />
    </div>
  );
}

function ScriptCardMock() {
  const lines = [
    { t: '0:12', text: 'Could you say that again, please?', active: true },
    { t: '0:15', text: "I didn't quite catch the last part." },
    { t: '0:19', text: 'Let me repeat it more slowly.' },
  ];
  return (
    <div className="relative motion-safe:animate-rise-in">
      <div className="absolute -left-4 -top-4 hidden rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft shadow-card sm:block">
        🔁 Đang lặp câu #1
      </div>
      <div className="card overflow-hidden shadow-lift">
        <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-skill-listening/15 text-lg" aria-hidden>
            🎧
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Bài 3 - Hỏi lại khi chưa nghe rõ</p>
            <p className="text-xs text-ink-faint">Tiếng Anh · Sơ–trung cấp</p>
          </div>
        </div>
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li
              key={l.t}
              className={`flex items-start gap-3 px-4 py-3 text-sm ${
                l.active ? 'bg-highlight-soft/50' : ''
              }`}
            >
              <span className="mt-0.5 w-10 shrink-0 text-xs tabular-nums text-ink-faint">{l.t}</span>
              <p className="flex-1 leading-relaxed text-ink">{l.text}</p>
              <span className="flex gap-1 text-ink-faint">
                <span className="grid h-6 w-6 place-items-center rounded-md border border-line" aria-hidden>
                  ⏮
                </span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-md border ${
                    l.active ? 'border-highlight-dark bg-highlight' : 'border-line'
                  }`}
                  aria-hidden
                >
                  🔁
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-ink-soft">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-skill-speaking/50 motion-safe:animate-loop-pulse" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-skill-speaking" />
          </span>
          Ghi âm shadowing của bạn để so sánh với bản gốc
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- USP BAR */

function UspBar() {
  const items = [
    { icon: '◐', title: 'Đủ bốn kỹ năng', desc: 'Nghe, Nói, Viết, Đọc trong cùng một lớp' },
    { icon: '▷', title: 'Video thật', desc: 'Script tự cắt theo câu, tua & lặp từng câu' },
    { icon: '✎', title: 'Giáo viên theo sát', desc: 'Giao bài, chấm và nhận xét từng học sinh' },
    { icon: '⬡', title: 'Đa ngôn ngữ', desc: 'Anh - Trung - Nhật - Hàn, mở rộng dần' },
  ];
  return (
    <section className="border-y border-line bg-surface">
      <div className="container-page grid gap-x-8 gap-y-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.title} className="flex gap-3">
            <span className="text-xl text-brand-light" aria-hidden>
              {it.icon}
            </span>
            <div>
              <p className="font-semibold text-ink">{it.title}</p>
              <p className="text-sm text-ink-soft">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- SKILLS */

function SkillsSection() {
  return (
    <section id="ky-nang" className="container-page py-16 lg:py-20">
      <SectionHeading
        eyebrow="Bốn kỹ năng"
        title="Một lớp học, ~luyện đủ~ Nghe · Nói · Viết · Đọc"
        description="Mỗi kỹ năng có màu và biểu tượng riêng, theo bạn suốt từ trang này tới lớp học và từng bài."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SKILLS.map((s) => (
          <div
            key={s.key}
            className="card card-hover flex gap-4 p-5"
            style={{ borderLeft: `4px solid ${s.color}` }}
          >
            <SkillIcon skill={s.key} size="lg" muted={s.comingSoon} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{s.label}</h3>
                {s.comingSoon && (
                  <span className="pill bg-ink/5 text-ink-faint">Sắp có</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{s.blurb}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- LANGUAGES */

function LanguagesBand() {
  return (
    <section id="ngon-ngu" className="bg-brand text-white">
      <div className="container-page py-14">
        <p className="text-sm font-semibold text-highlight">Ngôn ngữ hỗ trợ</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-white sm:text-3xl">
          Bắt đầu với bốn ngôn ngữ, thêm dần theo nhu cầu lớp học
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LANGUAGES.map((l) => (
            <div
              key={l.code}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-4"
            >
              <p className="font-display text-lg font-bold text-white">{l.native}</p>
              <p className="text-sm text-white/70">
                {l.flag} {l.name}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-white/25 px-4 py-4 text-sm text-white/60">
            Ngôn ngữ khác đang được chuẩn bị
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- TEACHER BANNER */

function TeacherBanner() {
  return (
    <section className="container-page py-14">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-highlight px-6 py-8 sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="text-2xl font-bold text-ink">Bạn là giáo viên?</h2>
          <p className="mt-1 max-w-xl text-ink/80">
            Tạo lớp, dán link YouTube để hệ thống tự cắt script, giao bài viết và theo dõi
            từng học sinh - không mất phí.
          </p>
        </div>
        <Link href="/register" className="btn bg-ink text-white hover:bg-ink/90">
          Tạo lớp học
        </Link>
      </div>
    </section>
  );
}

/* --------------------------------------------------- HOW IT WORKS */

function HowItWorks() {
  const steps = [
    { n: 1, title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản học sinh miễn phí bằng email trong chưa đầy một phút.' },
    { n: 2, title: 'Vào lớp của giáo viên', desc: 'Giáo viên thêm bạn bằng email. Lớp hiện ngay trên trang chính của bạn.' },
    { n: 3, title: 'Luyện từng kỹ năng', desc: 'Nghe với script, shadowing có ghi âm, nộp bài viết và nhận nhận xét.' },
  ];
  return (
    <section id="ve-chung-toi" className="border-t border-line bg-surface">
      <div className="container-page py-16 lg:py-20">
        <SectionHeading eyebrow="Cách hoạt động" title="Ba bước để ~vào việc~" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="border border-line bg-paper p-6"
              style={{ borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem' }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- TESTIMONIALS */

function Testimonials() {
  const items = [
    {
      quote:
        'Nút lặp một câu đúng là thứ mình cần. Nghe đi nghe lại tới khi bắt được âm cuối rồi mới qua câu tiếp.',
      name: 'Minh Anh',
      role: 'Học viên tiếng Nhật',
    },
    {
      quote:
        'Mình giao video YouTube buổi tối, sáng học sinh đã có script để luyện. Chấm bài viết ngay trong lớp, không cần Google Docs.',
      name: 'Thầy Quang',
      role: 'Giáo viên tiếng Anh',
    },
    {
      quote:
        'Ghi âm shadowing xong nghe lại thấy rõ chỗ mình nuốt âm. Tiến bộ nhanh hơn học chay.',
      name: 'Đức Huy',
      role: 'Học viên tiếng Hàn',
    },
  ];
  return (
    <section className="container-page py-16 lg:py-20">
      <SectionHeading eyebrow="Cảm nhận" title="Người học và giáo viên ~nói gì~" />
      <p className="mt-2 text-sm text-ink-faint">Lời chứng thực dưới đây là ví dụ minh hoạ.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <figure key={it.name} className="card p-6">
            <div
              className="mb-4 inline-block rounded-2xl rounded-bl-sm bg-paper px-4 py-3 text-sm leading-relaxed text-ink"
            >
              {it.quote}
            </div>
            <figcaption className="text-sm">
              <span className="font-semibold text-ink">{it.name}</span>
              <span className="text-ink-faint"> - {it.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------ FINAL CTA */

function FinalCta() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="container-page py-16 text-center">
        <h2 className="mx-auto max-w-xl text-3xl font-bold">
          Sẵn sàng cho câu đầu tiên?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-soft">
          Tạo tài khoản miễn phí và nhờ giáo viên thêm bạn vào lớp, hoặc tự mở lớp của riêng
          mình.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/register" className="btn-primary">
            Bắt đầu miễn phí
          </Link>
          <Link href="/login" className="btn-secondary">
            Đăng nhập
          </Link>
        </div>
      </div>
    </section>
  );
}
