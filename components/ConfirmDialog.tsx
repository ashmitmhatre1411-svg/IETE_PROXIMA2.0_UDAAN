'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  /** If set, the confirm button stays disabled until the user types exactly this text. */
  requireText?: string;
  busy?: boolean;
  error?: string | null;
  children?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  requireText,
  busy = false,
  error,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const [typed, setTyped] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    const t = setTimeout(() => (requireText ? inputRef.current : confirmRef.current)?.focus(), 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, requireText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const canConfirm = !busy && (!requireText || typed === requireText);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => !busy && onCancel()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-glow"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
        {description && <div id={descId} className="mt-2 text-[0.95rem] text-muted">{description}</div>}
        {children}
        {requireText && (
          <div className="mt-4">
            <label htmlFor={`${titleId}-t`} className="mb-1.5 block text-sm text-muted">
              Type <span className="font-semibold text-ink">{requireText}</span> to continue
            </label>
            <input
              id={`${titleId}-t`}
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="field"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={!canConfirm}
            onClick={() => void onConfirm()}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
