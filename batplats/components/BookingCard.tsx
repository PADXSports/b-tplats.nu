import StatusBadge from "@/components/StatusBadge";

export type BookingCardBooking = {
  id: string | number;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  guest_email?: string | null;
  listings: {
    title: string;
    price_per_season: number | null;
    harbours: {
      name: string | null;
      city: string | null;
    } | null;
  } | null;
  renter: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type BookingCardProps = {
  booking: BookingCardBooking;
  mode: "host" | "renter";
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  busy?: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

export default function BookingCard({ booking, mode, onAccept, onDecline, onCancel, busy = false }: BookingCardProps) {
  return (
    <article className="rounded-xl bg-[#122a5d] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{booking.listings?.title ?? "Okänd plats"}</p>
          <p className="text-xs text-white/70">
            {(booking.listings?.harbours?.name ?? "Okänd hamn")}
            {booking.listings?.harbours?.city ? `, ${booking.listings.harbours.city}` : ""}
          </p>
          <p className="text-xs text-white/70">
            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
          </p>
          <p className="text-xs text-white/70">
            {(booking.listings?.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong
          </p>
          {mode === "host" ? (
            <p className="mt-1 text-xs text-white/70">
              Hyresgäst: {booking.renter?.full_name || "Okänd"} ({booking.renter?.email || booking.guest_email || "Ingen e-post"})
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={booking.status} />
          {mode === "host" && booking.status === "pending" ? (
            <div className="flex gap-2">
              <button
                onClick={onAccept}
                disabled={busy}
                className="rounded-lg bg-[#14b8a6] px-3 py-2 text-xs font-semibold text-[#0b1b3f] disabled:opacity-50"
              >
                Godkänn
              </button>
              <button
                onClick={onDecline}
                disabled={busy}
                className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
              >
                Avvisa
              </button>
            </div>
          ) : null}
          {mode === "renter" && booking.status === "pending" && onCancel ? (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
            >
              Avboka
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
