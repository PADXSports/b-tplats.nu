import { normalizeRentalType } from "@/lib/rental-type";

type RentalTypeBadgeProps = {
  rentalType?: string | null;
  className?: string;
};

export default function RentalTypeBadge({ rentalType, className = "" }: RentalTypeBadgeProps) {
  const type = normalizeRentalType(rentalType);
  const label = type === "flexible" ? "Flexibel" : "Säsongsplats";

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#0d9488] px-2.5 py-0.5 text-[11px] font-semibold text-[#0d9488] ${className}`}
    >
      {label}
    </span>
  );
}
