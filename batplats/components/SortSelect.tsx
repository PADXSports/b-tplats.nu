"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SortOption = {
  value: string;
  label: string;
};

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: "default", label: "Standard" },
  { value: "nearest", label: "Närmast" },
];

type SortSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  label?: string;
  className?: string;
  compact?: boolean;
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

export default function SortSelect({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  label = "Sortering",
  className = "",
  compact = false,
}: SortSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "";

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || isMobile) return;

    const rect = trigger.getBoundingClientRect();
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      minWidth: Math.max(rect.width, 160),
      zIndex: 9999,
    });
  }, [isMobile]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [isOpen, isMobile, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, options, value]);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlightIndex];
      if (option) selectOption(option.value);
    }
  };

  const optionsList = (
    <ul role="listbox" aria-label={label} className="p-1.5">
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isHighlighted = index === highlightIndex;

        return (
          <li key={option.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => selectOption(option.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#0a1628] transition ${
                isHighlighted ? "bg-[#f5f0e8]" : "hover:bg-[#f5f0e8]"
              }`}
            >
              <span>{option.label}</span>
              {isSelected ? (
                <svg className="h-4 w-4 shrink-0 text-[#0d9488]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const panel = (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle}
      className={
        isMobile
          ? "relative max-h-[50dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dce3ee] bg-white shadow-[0_-12px_40px_rgba(15,31,61,0.2)]"
          : "overflow-y-auto rounded-xl border border-[#dce3ee] bg-white shadow-[0_12px_30px_rgba(15,31,61,0.16)]"
      }
    >
      {isMobile ? (
        <div className="sticky top-0 border-b border-[#dce3ee] bg-white px-4 py-3">
          <p className="text-sm font-bold text-[#0a1628]">{label}</p>
        </div>
      ) : null}
      {optionsList}
    </div>
  );

  const desktopPanel =
    isOpen && !isMobile && typeof document !== "undefined" ? createPortal(panel, document.body) : null;

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
            {panel}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleKeyDown}
        className={
          compact
            ? "inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#dce3ee] bg-white px-3 py-2 text-sm font-semibold text-[#0a1628] transition hover:border-[#0d9488] lg:min-h-0"
            : "flex min-h-[44px] w-full flex-col rounded-[2rem] px-4 py-3 text-left transition-colors hover:bg-[#f5f0e8] md:min-h-0 md:px-5 md:py-2.5"
        }
      >
        {compact ? (
          <>
            <span>{selectedLabel}</span>
            <svg className="h-4 w-4 text-[#8a96a8]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">{label}</span>
            <span className="mt-0.5 text-base text-[#4a5568] md:text-sm">{selectedLabel}</span>
          </>
        )}
      </button>
      {desktopPanel}
      {mobileSheet}
    </div>
  );
}
