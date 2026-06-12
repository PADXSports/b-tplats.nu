import type { RentalType } from "@/lib/rental-type";

type RentalTypeChoiceProps = {
  value: RentalType;
  onChange: (value: RentalType) => void;
  className?: string;
};

export default function RentalTypeChoice({ value, onChange, className = "" }: RentalTypeChoiceProps) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange("season")}
        className={`rounded-xl border-2 p-4 text-left transition ${
          value === "season"
            ? "border-[#0d9488] bg-[rgba(13,148,136,0.08)]"
            : "border-[#dce3ee] bg-white hover:border-[#0d9488]/40"
        }`}
      >
        <p className="font-semibold text-[#0a1628]">Hela säsongen</p>
        <p className="mt-1 text-sm text-[#4a5568]">
          Båtägare bokar hela säsongen på en gång. En bokning per plats och säsong.
        </p>
      </button>
      <button
        type="button"
        onClick={() => onChange("flexible")}
        className={`rounded-xl border-2 p-4 text-left transition ${
          value === "flexible"
            ? "border-[#0d9488] bg-[rgba(13,148,136,0.08)]"
            : "border-[#dce3ee] bg-white hover:border-[#0d9488]/40"
        }`}
      >
        <p className="font-semibold text-[#0a1628]">Flexibel uthyrning</p>
        <p className="mt-1 text-sm text-[#4a5568]">
          Kortare perioder inom säsongen. Minst en månad per bokning.
        </p>
      </button>
    </div>
  );
}
