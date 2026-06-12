"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  buildOutOfSeasonDisabledSet,
  formatDateSv,
  getCalendarCells,
  hasValidDateRange,
  meetsMinBookingMonths,
  rangeIncludesBookedDay,
  todayYmd,
} from "@/lib/date-range";

const WEEKDAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

export type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  bookedDates?: Set<string>;
  seasonStart?: string | null;
  seasonEnd?: string | null;
  minBookingMonths?: number;
  onDateError?: (message: string | null) => void;
  variant?: "inline" | "field";
  fieldLabel?: string;
  className?: string;
  showLegend?: boolean;
  dateClashMessage?: string;
  minRangeMessage?: string;
};

function useIsMobile(breakpoint = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  bookedDates,
  seasonStart,
  seasonEnd,
  minBookingMonths = 0,
  onDateError,
  variant = "inline",
  fieldLabel = "Datum",
  className = "",
  showLegend = true,
  dateClashMessage = "Dessa datum är redan bokade. Välj andra datum.",
  minRangeMessage = "Minsta bokningslängd är en månad.",
}: DateRangePickerProps) {
  const now = new Date();
  const [calendarView, setCalendarView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [bookedTooltipYmd, setBookedTooltipYmd] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const booked = bookedDates ?? new Set<string>();
  const validRange = hasValidDateRange(startDate, endDate);
  const today = todayYmd();

  const outOfSeasonDates = useMemo(
    () => buildOutOfSeasonDisabledSet(seasonStart, seasonEnd, calendarView.y, calendarView.m),
    [seasonStart, seasonEnd, calendarView.y, calendarView.m],
  );

  const disabledDates = useMemo(() => {
    const merged = new Set<string>(booked);
    outOfSeasonDates.forEach((ymd) => merged.add(ymd));
    return merged;
  }, [booked, outOfSeasonDates]);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarView.y, calendarView.m),
    [calendarView.y, calendarView.m],
  );

  const monthTitle = useMemo(() => {
    const d = new Date(calendarView.y, calendarView.m, 1);
    return d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  }, [calendarView.y, calendarView.m]);

  const shiftMonth = (delta: number) => {
    setCalendarView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const showBookedTooltip = useCallback((ymd: string) => {
    setBookedTooltipYmd(ymd);
    window.setTimeout(() => setBookedTooltipYmd(null), 2000);
  }, []);

  const handleDayClick = useCallback(
    (ymd: string) => {
      onDateError?.(null);
      setBookedTooltipYmd(null);

      if (disabledDates.has(ymd)) {
        if (booked.has(ymd)) {
          onDateError?.(dateClashMessage);
        }
        return;
      }

      if (!startDate || (startDate && endDate)) {
        onStartDateChange(ymd);
        onEndDateChange("");
        return;
      }

      if (ymd < startDate) {
        onStartDateChange(ymd);
        onEndDateChange("");
        return;
      }

      if (rangeIncludesBookedDay(startDate, ymd, disabledDates)) {
        onDateError?.(dateClashMessage);
        return;
      }

      if (minBookingMonths > 0 && !meetsMinBookingMonths(startDate, ymd, minBookingMonths)) {
        onDateError?.(minRangeMessage);
        return;
      }

      onEndDateChange(ymd);
    },
    [
      startDate,
      endDate,
      disabledDates,
      booked,
      minBookingMonths,
      onStartDateChange,
      onEndDateChange,
      onDateError,
      dateClashMessage,
      minRangeMessage,
    ],
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || isMobile) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const maxHeight = Math.max(280, Math.min(spaceBelow, 520));

    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 320),
      maxHeight,
      zIndex: 9999,
    });
  }, [isMobile]);

  useEffect(() => {
    if (variant !== "field" || !isOpen || isMobile) return;

    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [variant, isOpen, isMobile, updatePanelPosition]);

  useEffect(() => {
    if (variant !== "field" || !isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [variant, isOpen]);

  useEffect(() => {
    if (variant !== "field" || !isOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [variant, isOpen, isMobile]);

  const fieldSummary =
    startDate && endDate && validRange
      ? `${formatDateSv(startDate)} – ${formatDateSv(endDate)}`
      : startDate
        ? `${formatDateSv(startDate)} – Välj slut`
        : "Välj in- och utcheckning";

  const periodSummary =
    startDate || endDate ? (
      <p className="mt-3 px-1 text-sm text-[#0a1628]">
        <span className="font-semibold">Vald period: </span>
        {startDate ? formatDateSv(startDate) : "..."} till {endDate ? formatDateSv(endDate) : "..."}
      </p>
    ) : null;

  const calendar = (
    <div className="relative rounded-xl border border-[#dce3ee] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#dce3ee] px-3 py-1.5 text-base font-semibold text-[#0a1628] transition active:bg-[#f5f0e8] md:min-h-9 md:min-w-9 md:text-sm"
          aria-label="Föregående månad"
        >
          ←
        </button>
        <span className="text-center text-base font-bold capitalize text-[#0a1628] md:text-sm">{monthTitle}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#dce3ee] px-3 py-1.5 text-base font-semibold text-[#0a1628] transition active:bg-[#f5f0e8] md:min-h-9 md:min-w-9 md:text-sm"
          aria-label="Nästa månad"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[#8a96a8]">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-2 md:gap-1">
        {calendarCells.map(({ ymd, day, inMonth }) => {
          const isBooked = booked.has(ymd);
          const isDisabled = disabledDates.has(ymd);
          const isToday = ymd === today;
          const hasRange = Boolean(startDate && endDate && startDate < endDate);
          const isRangeFill =
            hasRange && ymd >= startDate && ymd <= endDate && !(ymd === startDate || ymd === endDate);
          const isEndpoint = (startDate && ymd === startDate) || (endDate && ymd === endDate && validRange);

          let cellClass =
            "relative flex min-h-11 items-center justify-center rounded-lg text-base font-medium transition md:min-h-9 md:text-sm ";

          if (!inMonth) {
            cellClass += "text-[#c5d0de] ";
          } else if (isDisabled) {
            cellClass += isBooked
              ? "cursor-not-allowed bg-[#ebe6dc] text-[#8a96a8] line-through decoration-[#8a96a8] "
              : "cursor-not-allowed bg-[#f5f0e8] text-[#c5d0de] ";
          } else if (isEndpoint) {
            cellClass += "bg-[#0d9488] text-white shadow-sm ";
          } else if (isRangeFill) {
            cellClass += "bg-[#d4f0ec] text-[#0a1628] ";
          } else {
            cellClass += "cursor-pointer bg-white text-[#0a1628] hover:bg-[#0d9488]/15 ";
          }

          if (isToday && !isDisabled && inMonth) {
            cellClass += "ring-2 ring-[#0d9488] ring-offset-1 ";
          }

          if (!inMonth) {
            return (
              <div
                key={ymd}
                className="flex min-h-11 items-center justify-center text-base text-[#c5d0de] md:min-h-9 md:text-sm"
              >
                {day}
              </div>
            );
          }

          return (
            <div key={ymd} className="relative">
              <button
                type="button"
                title={isBooked ? "Upptagen" : isDisabled ? "Utanför säsong" : undefined}
                onClick={() => {
                  if (isDisabled) {
                    if (isBooked) {
                      showBookedTooltip(ymd);
                    }
                    return;
                  }
                  handleDayClick(ymd);
                }}
                className={cellClass + "w-full"}
              >
                {day}
              </button>
              {bookedTooltipYmd === ymd ? (
                <span className="absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a1628] px-2 py-0.5 text-[0.7rem] text-white shadow">
                  Redan bokad
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {showLegend ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#dce3ee] pt-3 text-xs text-[#8a96a8]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-[#dce3ee] bg-white" />
            Tillgänglig
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-[#0d9488]" />
            Vald
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-[#ebe6dc]" />
            Upptagna datum
          </span>
        </div>
      ) : null}
    </div>
  );

  if (variant === "field") {
    const desktopPanel =
      isOpen && !isMobile && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="overflow-y-auto rounded-xl border border-[#dce3ee] bg-white p-2 shadow-[0_12px_30px_rgba(15,31,61,0.16)]"
            >
              {calendar}
              {periodSummary}
            </div>,
            document.body,
          )
        : null;

    const mobileSheet =
      isOpen && isMobile && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <button
                type="button"
                className="absolute inset-0 bg-[#0a1628]/50"
                aria-label="Stäng"
                onClick={() => setIsOpen(false)}
              />
              <div
                ref={panelRef}
                className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_-12px_40px_rgba(15,31,61,0.2)]"
              >
                <div className="mb-3 flex items-center justify-between border-b border-[#dce3ee] pb-3">
                  <p className="text-sm font-bold text-[#0a1628]">{fieldLabel}</p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8a96a8] hover:bg-[#f5f0e8] hover:text-[#0a1628]"
                  >
                    Stäng
                  </button>
                </div>
                {calendar}
                {periodSummary}
              </div>
            </div>,
            document.body,
          )
        : null;

    return (
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-[44px] w-full flex-col rounded-[2rem] px-4 py-2.5 text-left transition-colors hover:bg-[#f5f0e8] md:min-h-0 md:px-5"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">{fieldLabel}</span>
          <span className="mt-0.5 text-base text-[#4a5568] md:text-sm">{fieldSummary}</span>
        </button>
        {desktopPanel}
        {mobileSheet}
      </div>
    );
  }

  return (
    <div className={className}>
      {calendar}
      {(startDate || endDate) && (
        <p className="mt-4 text-sm text-[#0a1628]">
          <span className="font-semibold">Vald period: </span>
          {startDate ? formatDateSv(startDate) : "..."} till {endDate ? formatDateSv(endDate) : "..."}
        </p>
      )}
    </div>
  );
}
