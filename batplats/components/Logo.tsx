import { useId } from "react";

type LogoProps = {
  dark?: boolean;
};

export default function Logo({ dark = false }: LogoProps) {
  const gradientId = useId().replace(/:/g, "");
  const textColor = dark ? "#ffffff" : "#0a1628";

  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Båtplats.nu">
      {/* Icon: dark navy square with two teal bars */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-9 w-9 shrink-0"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${gradientId}-bar1`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id={`${gradientId}-bar2`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="6" fill="#0f1f3d" />
        <rect width="36" height="36" rx="6" stroke="#0d9488" strokeOpacity="0.3" strokeWidth="1" />
        <rect x="13" y="8" width="4" height="20" rx="2" fill={`url(#${gradientId}-bar1)`} />
        <rect x="19" y="8" width="4" height="20" rx="2" fill={`url(#${gradientId}-bar2)`} fillOpacity="0.85" />
      </svg>

      {/* Text: Båtplats.nu */}
      <span
        className="text-lg font-extrabold tracking-[-0.04em] sm:text-xl"
        style={{ color: textColor }}
      >
        Båtplats.nu
      </span>
    </span>
  );
}
