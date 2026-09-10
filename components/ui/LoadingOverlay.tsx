import Spinner from './Spinner';

export default function LoadingOverlay({ label = 'Đang xử lý…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/30 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-4 shadow-lift">
        <Spinner className="h-5 w-5 text-brand" />
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
    </div>
  );
}
