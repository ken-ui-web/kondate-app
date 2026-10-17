/** ローカルタイムゾーン基準の日付ユーティリティ */

const DOW = ['日', '月', '火', '水', '木', '金', '土']

export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}

export function today(): string {
  return fmtDate(new Date())
}

/** "10/17（土）" */
export function fmtDisplay(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）`
}

/** 曜日の文字と番号（0=日 … 6=土） */
export function dayOfWeek(dateStr: string): { label: string; index: number } {
  const index = parseDate(dateStr).getDay()
  return { label: DOW[index], index }
}
