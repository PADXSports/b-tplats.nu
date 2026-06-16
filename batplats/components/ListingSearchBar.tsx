"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import DateRangePicker from "@/components/DateRangePicker";
import AreaTagInput from "@/components/AreaTagInput";
import type { AreaTag } from "@/lib/area-search";
import { SEASON_YEAR_OPTIONS, type RentalPeriodMode } from "@/lib/rental-type";

type ListingSearchBarProps = {
  selectedAreas: AreaTag[];
  onAddTag: (tag: AreaTag) => void;
  onUpdateTagPolygon: (tagId: string, polygon: import("@/lib/area-search").GeoJsonGeometry) => void;
  onRemoveTag: (tagId: string) => void;
  rentalPeriod: RentalPeriodMode;
  seasonYear: string;
  onRentalPeriodChange: (value: RentalPeriodMode) => void;
  onSeasonYearChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDateError?: (message: string | null) => void;
  dateError?: string;
  boatLength: string;
  boatWidth: string;
  boatDepth: string;
  onBoatLengthChange: (value: string) => void;
  onBoatWidthChange: (value: string) => void;
  onBoatDepthChange: (value: string) => void;
  onSearch: () => void;
  className?: string;
  variant?: "default" | "hero";
  submitLabel?: string;
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

function formatShortDateSv(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function formatRentalPeriodSummary(
  rentalPeriod: RentalPeriodMode,
  seasonYear: string,
  startDate: string,
  endDate: string,
): string {
  if (rentalPeriod === "all") return "Alla typer";
  if (rentalPeriod === "seasonal") return `Säsong ${seasonYear}`;
  if (startDate && endDate) return `${formatShortDateSv(startDate)} – ${formatShortDateSv(endDate)}`;
  return "Korttid";
}

function formatBoatSizeDisplay(length: string, width: string, depth: string): string {
  const l = length.trim();
  const w = width.trim();
  const d = depth.trim();
  if (!l && !w && !d) return "Valfri storlek";
  if (l && !w && !d) return `${l}m längd`;
  if (l && w) return `${l}m × ${w}m`;
  if (l && d) return `${l}m × ${d}m`;
  if (w && d) return `${w}m × ${d}m`;
  if (w) return `${w}m bredd`;
  if (d) return `${d}m djup`;
  return "Valfri storlek";
}

function BoatSizeInputRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-[#0a1628]">
      <span className="font-medium">{label}</span>
      <div className="relative w-28">
        <input
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          placeholder="—"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-[#dce3ee] bg-white px-3 py-2 pr-7 text-sm text-[#0a1628] outline-none focus:border-[#0d9488]"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8a96a8]">m</span>
      </div>
    </label>
  );
}

function SearchFieldButton({
  label,
  value,
  onClick,
  className = "",
}: {
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`search-field group flex w-full min-w-0 flex-1 cursor-pointer flex-col rounded-[2rem] px-4 py-3 text-left transition-colors hover:bg-[#f5f0e8] md:px-5 md:py-2.5 ${className}`}
    >
      <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">{label}</span>
      <span className="mt-0.5 truncate text-base text-[#4a5568] md:text-sm">{value}</span>
    </button>
  );
}

export default function ListingSearchBar({
  selectedAreas,
  onAddTag,
  onUpdateTagPolygon,
  onRemoveTag,
  rentalPeriod,
  seasonYear,
  onRentalPeriodChange,
  onSeasonYearChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDateError,
  dateError,
  boatLength,
  boatWidth,
  boatDepth,
  onBoatLengthChange,
  onBoatWidthChange,
  onBoatDepthChange,
  onSearch,
  className = "",
  variant = "default",
  submitLabel = "Sök platser",
}: ListingSearchBarProps) {
  const pillClassName =
    variant === "hero"
      ? "relative z-30 w-full overflow-visible rounded-[2.25rem] bg-white p-2 shadow-[0_8px_40px_rgba(0,0,0,0.3)] ring-1 ring-white/10 md:p-1.5"
      : "relative z-30 w-full overflow-visible rounded-[2.25rem] border border-[rgba(10,22,40,0.06)] bg-white p-2 shadow-[0_8px_30px_rgba(10,22,40,0.10)] md:p-1.5";
  const isMobile = useIsMobile();
  const [boatSizeOpen, setBoatSizeOpen] = useState(false);
  const [rentalPeriodOpen, setRentalPeriodOpen] = useState(false);
  const boatSizePanelRef = useRef<HTMLDivElement>(null);
  const rentalPeriodPanelRef = useRef<HTMLDivElement>(null);

  const boatSizeSummary = formatBoatSizeDisplay(boatLength, boatWidth, boatDepth);
  const rentalPeriodSummary = formatRentalPeriodSummary(rentalPeriod, seasonYear, startDate, endDate);

  const closeBoatSizePanel = useCallback(() => setBoatSizeOpen(false), []);
  const closeRentalPeriodPanel = useCallback(() => setRentalPeriodOpen(false), []);

  useEffect(() => {
    if (!boatSizeOpen || isMobile) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (boatSizePanelRef.current?.contains(target)) return;
      closeBoatSizePanel();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [boatSizeOpen, isMobile, closeBoatSizePanel]);

  useEffect(() => {
    if (!rentalPeriodOpen || isMobile) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rentalPeriodPanelRef.current?.contains(target)) return;
      closeRentalPeriodPanel();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [rentalPeriodOpen, isMobile, closeRentalPeriodPanel]);

  useEffect(() => {
    if ((!boatSizeOpen && !rentalPeriodOpen) || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [boatSizeOpen, rentalPeriodOpen, isMobile]);

  const boatSizeFields = (
    <div className="flex flex-col gap-3">
      <BoatSizeInputRow label="Längd" value={boatLength} onChange={onBoatLengthChange} />
      <BoatSizeInputRow label="Bredd" value={boatWidth} onChange={onBoatWidthChange} />
      <BoatSizeInputRow label="Djup" value={boatDepth} onChange={onBoatDepthChange} />
    </div>
  );

  const rentalPeriodPanelContent = (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce3ee] p-3 transition hover:border-[#0d9488]/40">
        <input
          type="radio"
          name="rental-period"
          checked={rentalPeriod === "all"}
          onChange={() => onRentalPeriodChange("all")}
          className="mt-1 accent-[#0d9488]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#0a1628]">Visa alla typer</span>
          <span className="mt-0.5 block text-xs text-[#8a96a8]">Ingen typ- eller datumfiltrering</span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce3ee] p-3 transition hover:border-[#0d9488]/40">
        <input
          type="radio"
          name="rental-period"
          checked={rentalPeriod === "seasonal"}
          onChange={() => onRentalPeriodChange("seasonal")}
          className="mt-1 accent-[#0d9488]"
        />
        <span className="w-full">
          <span className="block text-sm font-semibold text-[#0a1628]">Säsongsplats</span>
          <span className="mt-0.5 block text-xs text-[#8a96a8]">Hela säsongen (maj–sep)</span>
          {rentalPeriod === "seasonal" ? (
            <select
              value={seasonYear}
              onChange={(event) => onSeasonYearChange(event.target.value)}
              className="mt-3 w-full rounded-lg border border-[#dce3ee] bg-white px-3 py-2 text-sm text-[#0a1628] outline-none focus:border-[#0d9488]"
            >
              {SEASON_YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          ) : null}
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce3ee] p-3 transition hover:border-[#0d9488]/40">
        <input
          type="radio"
          name="rental-period"
          checked={rentalPeriod === "short_term"}
          onChange={() => onRentalPeriodChange("short_term")}
          className="mt-1 accent-[#0d9488]"
        />
        <span className="w-full">
          <span className="block text-sm font-semibold text-[#0a1628]">Korttid</span>
          <span className="mt-0.5 block text-xs text-[#8a96a8]">Välj dina datum</span>
          {rentalPeriod === "short_term" ? (
            <div className="mt-3">
              <DateRangePicker
                variant="inline"
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
                onDateError={onDateError}
                showLegend={false}
              />
            </div>
          ) : null}
        </span>
      </label>
    </div>
  );

  const mobileBoatSizeSheet =
    boatSizeOpen && isMobile && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-[#0a1628]/50"
              aria-label="Stäng"
              onClick={closeBoatSizePanel}
            />
            <div
              ref={boatSizePanelRef}
              className="relative max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_-12px_40px_rgba(15,31,61,0.2)]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#dce3ee] pb-3">
                <p className="text-sm font-bold text-[#0a1628]">Båtstorlek</p>
                <button
                  type="button"
                  onClick={closeBoatSizePanel}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8a96a8] hover:bg-[#f5f0e8] hover:text-[#0a1628]"
                >
                  Klar
                </button>
              </div>
              {boatSizeFields}
            </div>
          </div>,
          document.body,
        )
      : null;

  const mobileRentalPeriodSheet =
    rentalPeriodOpen && isMobile && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-[#0a1628]/50"
              aria-label="Stäng"
              onClick={closeRentalPeriodPanel}
            />
            <div
              ref={rentalPeriodPanelRef}
              className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_-12px_40px_rgba(15,31,61,0.2)]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#dce3ee] pb-3">
                <p className="text-sm font-bold text-[#0a1628]">Typ &amp; period</p>
                <button
                  type="button"
                  onClick={closeRentalPeriodPanel}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8a96a8] hover:bg-[#f5f0e8] hover:text-[#0a1628]"
                >
                  Klar
                </button>
              </div>
              {rentalPeriodPanelContent}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <div id="search-hero" className={pillClassName}>
        <div className="flex flex-col gap-2 overflow-visible md:flex-row md:items-stretch md:gap-0 md:pr-1">
          <AreaTagInput
            selectedAreas={selectedAreas}
            onAddTag={onAddTag}
            onUpdateTagPolygon={onUpdateTagPolygon}
            onRemoveTag={onRemoveTag}
            onEnter={onSearch}
          />

          <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />

          <div className="relative w-full md:min-w-[180px] md:flex-1">
            <SearchFieldButton
              label="Typ & period"
              value={rentalPeriodSummary}
              onClick={() => setRentalPeriodOpen((open) => !open)}
            />
            {rentalPeriodOpen && !isMobile ? (
              <div
                ref={rentalPeriodPanelRef}
                className="absolute left-0 top-[calc(100%+8px)] z-[10060] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_12px_40px_rgba(15,31,61,0.16)]"
              >
                {rentalPeriodPanelContent}
              </div>
            ) : null}
          </div>

          <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />

          <div className="relative w-full md:min-w-[160px] md:flex-1">
            <SearchFieldButton
              label="Båtstorlek"
              value={boatSizeSummary}
              onClick={() => setBoatSizeOpen((open) => !open)}
            />
            {boatSizeOpen && !isMobile ? (
              <div
                ref={boatSizePanelRef}
                className="absolute right-0 top-[calc(100%+8px)] z-[10060] w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_12px_40px_rgba(15,31,61,0.16)]"
              >
                {boatSizeFields}
              </div>
            ) : null}
          </div>

          {dateError ? <p className="px-2 text-sm text-red-500 md:col-span-full">{dateError}</p> : null}

          <button
            type="button"
            onClick={onSearch}
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#0d9488] px-6 py-3.5 text-base font-semibold text-white shadow-[0_4px_20px_rgba(13,148,136,0.35)] transition hover:scale-[1.02] hover:bg-[#14b8a6] md:mt-0 md:ml-1 md:w-auto md:self-center md:text-[15px]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" />
              <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {submitLabel}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .pac-container {
          z-index: 10050 !important;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 31, 61, 0.16);
          margin-top: 4px;
          font-family: inherit;
        }
        .pac-item {
          padding: 10px 12px;
          color: #0a1628;
          cursor: pointer;
          border-top: 1px solid #f1f5f9;
        }
        .pac-item:first-child {
          border-top: none;
        }
        .pac-item:hover,
        .pac-item-selected {
          background: #f0fdfa !important;
          color: #0a1628 !important;
        }
        .pac-item-query {
          color: #0a1628;
          font-size: 14px;
        }
        .pac-matched {
          color: #0d9488;
          font-weight: 600;
        }
        .pac-icon {
          display: none;
        }
      `}</style>
      {mobileBoatSizeSheet}
      {mobileRentalPeriodSheet}
    </div>
  );
}
