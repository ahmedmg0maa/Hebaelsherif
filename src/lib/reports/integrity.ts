export const REPORT_MONTH_OPTIONS = [1, 3, 6, 12] as const
export function reportMonths(value: unknown): number {
  const number = typeof value === 'string' && /^\d{1,2}$/.test(value) ? Number(value) : typeof value === 'number' ? value : NaN
  return REPORT_MONTH_OPTIONS.some(months => months === number) ? number : 12
}
export function completeReportRead(result: { data: unknown[] | null; count: number | null; error: unknown }): boolean {
  return !result.error && Array.isArray(result.data) && Number.isInteger(result.count) && result.count === result.data.length
}
