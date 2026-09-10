import Spinner from './Spinner';

export default function RouteLoading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="container-page flex items-center justify-center gap-3 py-24 text-ink-soft">
      <Spinner className="h-5 w-5 text-brand" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
