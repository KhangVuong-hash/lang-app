'use client';

import { useState, type ReactNode } from 'react';
import Spinner from './Spinner';

export default function ConfirmButton({
  onConfirm,
  children,
  question = 'Chắc chắn?',
  confirmLabel = 'Xác nhận',
  className = 'text-sm font-medium text-danger hover:underline',
}: {
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
  question?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={className}>
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="text-ink-soft">{question}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
        className="btn btn-sm bg-danger text-white hover:opacity-90"
      >
        {busy && <Spinner />}
        {confirmLabel}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setArmed(false)}
        className="btn-ghost btn-sm"
      >
        Huỷ
      </button>
    </span>
  );
}
