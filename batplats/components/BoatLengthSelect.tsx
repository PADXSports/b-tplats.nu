"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type BoatLengthOption = {
  value: string;
  label: string;
};

const DEFAULT_OPTIONS: BoatLengthOption[] = [
  { value: "", label: "Valfri storlek" },
  { value: "8", label: "Upp till 8 m" },
  { value: "12", label: "8–12 m" },
  { value: "16", label: "12–16 m" },
  { value: "17", label: "16 m+" },
];

type BoatLengthSelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  options?: BoatLengthOption[];
  className?: string;
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

export default function BoatLengthSelect({
  value,
  onChange,
  label = "Båtlängd",
  options = DEFAULT_OPTIONS,
  className = "",
}: BoatLengthSelectProps) {
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
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const maxHeight = Math.max(160, Math.min(spaceBelow, 320));

    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 240),
      maxHeight,
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

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isMobile]);

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
          <li key={option.value || "any"} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => selectOption(option.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-base text-[#0a1628] transition md:text-sm ${
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

  const desktopPanel =
    isOpen && !isMobile && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="overflow-y-auto rounded-xl border border-[#dce3ee] bg-white shadow-[0_12px_30px_rgba(15,31,61,0.16)]"
          >
            {optionsList}
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
              className="relative max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dce3ee] bg-white shadow-[0_-12px_40px_rgba(15,31,61,0.2)]"
            >
              <div className="sticky top-0 border-b border-[#dce3ee] bg-white px-4 py-3">
                <p className="text-sm font-bold text-[#0a1628]">{label}</p>
              </div>
              {optionsList}
            </div>
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
        className="flex min-h-[44px] w-full flex-col rounded-[2rem] px-4 py-3 text-left transition-colors hover:bg-[#f5f0e8] md:min-h-0 md:px-5 md:py-2.5"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">{label}</span>
        <span className="mt-0.5 text-base text-[#4a5568] md:text-sm">{selectedLabel}</span>
      </button>
      {desktopPanel}
      {mobileSheet}
    </div>
  );
}
