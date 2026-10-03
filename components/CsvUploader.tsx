'use client';

import Papa from 'papaparse';
import { useRef, useState } from 'react';
import { TOTAL_STUDENTS } from '@/lib/constants';

export interface ParsedCsv {
  fileName: string;
  rows: Array<{ name: string; branch: string }>;
  /** Set when the file itself could not be read as the expected CSV. */
  problem: string | null;
}

const MAX_BYTES = 256 * 1024;
const IGNORABLE = new Set(['TooFewFields', 'TooManyFields', 'UndetectableDelimiter']);

export function CsvUploader({ onParsed, disabled = false }: { onParsed: (p: ParsedCsv) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handle(file: File | undefined) {
    if (!file) return;
    const fail = (problem: string) => onParsed({ fileName: file.name, rows: [], problem });

    if (!/\.csv$/i.test(file.name) && !file.type.startsWith('text/') && file.type !== 'application/vnd.ms-excel') {
      return fail('That is not a CSV file. Export your sheet as .csv and try again.');
    }
    if (file.size === 0) return fail('That file is empty.');
    if (file.size > MAX_BYTES) return fail('That file is too large for a list of 45 students.');

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim().toLowerCase(),
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        if (!fields.includes('name')) {
          return fail('The first row must be a header: name,branch');
        }
        const hard = res.errors.filter((e) => !IGNORABLE.has(e.code));
        if (hard.length > 0) return fail('This file could not be read as a CSV. Check for stray quotes and try again.');
        onParsed({
          fileName: file.name,
          rows: res.data.map((r) => ({ name: r.name ?? '', branch: r.branch ?? '' })),
          problem: null,
        });
      },
      error: () => fail('This file could not be read. Try exporting it again.'),
    });
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handle(e.dataTransfer.files?.[0]); }}
      className={`rounded-2xl border border-dashed px-6 py-10 text-center transition ${dragging ? 'border-violet bg-violet/10' : 'border-line bg-void/40'}`}
    >
      <p className="font-medium text-ink">Drop your student CSV here</p>
      <p className="mt-1 text-sm text-muted">
        Columns: <code className="rounded bg-panel2 px-1.5 py-0.5 text-violet-soft">name,branch</code> · exactly {TOTAL_STUDENTS} students
      </p>
      <button className="btn-primary mt-5" disabled={disabled} onClick={() => input.current?.click()}>
        Choose CSV file
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = ''; // allow re-selecting the same file after fixing it
        }}
      />
    </div>
  );
}
