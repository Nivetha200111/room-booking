/** Build a CSV string from rows. Arrays are joined with "; ". */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return columns ? columns.join(',') : ''
  const cols = columns ?? Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const today = () => new Date().toISOString().slice(0, 10)
