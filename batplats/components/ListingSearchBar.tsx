"use client";

import BoatLengthSelect from "@/components/BoatLengthSelect";
import DateRangePicker from "@/components/DateRangePicker";

type ListingSearchBarProps = {
  location: string;
  onLocationChange: (value: string) => void;
  onLocationFocus?: () => void;
  onLocationBlur?: () => void;
  onLocationKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  locationSuggestions?: React.ReactNode;
  isLocationLoading?: boolean;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDateError?: (message: string | null) => void;
  dateError?: string;
  boatLength: string;
  onBoatLengthChange: (value: string) => void;
  onSearch: () => void;
  className?: string;
};

export default function ListingSearchBar({
  location,
  onLocationChange,
  onLocationFocus,
  onLocationBlur,
  onLocationKeyDown,
  locationSuggestions,
  isLocationLoading = false,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDateError,
  dateError,
  boatLength,
  onBoatLengthChange,
  onSearch,
  className = "",
}: ListingSearchBarProps) {
  return (
    <div className={className}>
      <div
        id="search-hero"
        className="relative z-30 w-full overflow-visible rounded-[2.25rem] border border-[rgba(10,22,40,0.06)] bg-white p-2 shadow-[0_8px_30px_rgba(10,22,40,0.10)] md:p-1.5"
      >
        <div className="flex flex-col gap-2 overflow-visible md:flex-row md:items-stretch md:gap-0 md:pr-1">
          <label className="search-field group flex w-full flex-1 cursor-text flex-col rounded-[2rem] px-4 py-3 transition-colors hover:bg-[#f5f0e8] md:px-5 md:py-2.5">
            <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">
              Område
            </span>
            <div className="relative mt-0.5">
              <input
                type="text"
                placeholder="Stockholm, Östermalm eller 115 21"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                onFocus={onLocationFocus}
                onBlur={onLocationBlur}
                onKeyDown={onLocationKeyDown}
                className="min-h-[44px] w-full bg-transparent pr-6 text-base text-[#4a5568] outline-none placeholder:text-[#8a96a8] md:min-h-0 md:text-sm"
              />
              {isLocationLoading ? (
                <span
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#0d9488]"
                  aria-hidden
                >
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              ) : null}
              {locationSuggestions}
            </div>
          </label>
          <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />
          <div className="w-full flex-1 md:w-auto">
            <DateRangePicker
              variant="field"
              fieldLabel="Datum"
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
              onDateError={onDateError}
              showLegend={false}
              className="w-full"
            />
          </div>
          <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />
          <div className="w-full flex-1 md:w-auto">
            <BoatLengthSelect value={boatLength} onChange={onBoatLengthChange} className="w-full" />
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
            Sök
          </button>
        </div>
      </div>
    </div>
  );
}
