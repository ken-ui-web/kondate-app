/** ローカルタイムゾーン基準の日付ユーティリティ */

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

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}

/** 月内の全日付 ("YYYY-MM-DD") */
export function datesOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= last; d++) {
    out.push(`${month}-${String(d).padStart(2, '0')}`)
  }
  return out
}

export function today(): string {
  return fmtDate(new Date())
}

/** その日を含む「土曜はじまり」の週の土曜日を返す */
export function weekStartSat(dateStr: string): string {
  const d = parseDate(dateStr)
  const dow = d.getDay() // 0=日 ... 6=土
  const diff = (dow + 1) % 7 // 土曜からの経過日数
  d.setDate(d.getDate() - diff)
  return fmtDate(d)
}

export function weekDates(startStr: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startStr, i))
}

export function fmtDisplay(dateStr: string): string {
  const d = parseDate(dateStr)
  const dows = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${dows[d.getDay()]}）`
}
