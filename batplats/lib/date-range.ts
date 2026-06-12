export function normalizeYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYmd(): string {
  return ymdFromDate(new Date());
}

export function expandRangeToSet(startYmd: string, endYmd: string, out: Set<string>) {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  if (!ys || !ms || !ds || !ye || !me || !de) return;
  let cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  while (cur <= end) {
    out.add(ymdFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

export function rangeIncludesBookedDay(startYmd: string, endYmd: string, booked: Set<string>): boolean {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  if (!ys || !ms || !ds || !ye || !me || !de) return true;
  let cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  while (cur <= end) {
    if (booked.has(ymdFromDate(cur))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export function getCalendarCells(viewYear: number, viewMonth: number): { ymd: string; day: number; inMonth: boolean }[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = (first.getDay() + 6) % 7;
  const cells: { ymd: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(viewYear, viewMonth, 1 - startPad + i);
    cells.push({
      ymd: ymdFromDate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth,
    });
  }
  return cells;
}

export function hasValidDateRange(startDate: string, endDate: string): boolean {
  return Boolean(startDate) && Boolean(endDate) && new Date(endDate).getTime() > new Date(startDate).getTime();
}

export function formatDateSv(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function addMonthsYmd(ymd: string, months: number): string {
  const normalized = normalizeYmd(ymd);
  if (!normalized) return ymd;
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);
  return ymdFromDate(date);
}

export function meetsMinBookingMonths(startYmd: string, endYmd: string, minMonths = 1): boolean {
  if (!hasValidDateRange(startYmd, endYmd)) return false;
  const minEnd = addMonthsYmd(startYmd, minMonths);
  return endYmd >= minEnd;
}

export function buildOutOfSeasonDisabledSet(
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined,
  viewYear: number,
  viewMonth: number,
): Set<string> {
  const start = normalizeYmd(seasonStart);
  const end = normalizeYmd(seasonEnd);
  const disabled = new Set<string>();
  if (!start || !end) return disabled;

  const cells = getCalendarCells(viewYear, viewMonth);
  for (const { ymd, inMonth } of cells) {
    if (!inMonth) continue;
    if (ymd < start || ymd > end) {
      disabled.add(ymd);
    }
  }
  return disabled;
}
