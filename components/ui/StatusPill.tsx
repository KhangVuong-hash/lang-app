const TONES = {
  open: 'bg-success/10 text-success',
  closed: 'bg-ink/5 text-ink-faint',
  info: 'bg-skill-listening/10 text-skill-listening',
  warn: 'bg-highlight-soft text-ink',
  done: 'bg-success/10 text-success',
};

export default function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`pill ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children}
    </span>
  );
}
