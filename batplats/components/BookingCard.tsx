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
    <article className="rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-[#222222]">{booking.listings?.title ?? "Okänd plats"}</p>
          <p className="text-sm text-[#717171]">
            {(booking.listings?.harbours?.name ?? "Okänd hamn")}
            {booking.listings?.harbours?.city ? `, ${booking.listings.harbours.city}` : ""}
          </p>
          <p className="text-sm text-[#717171]">
            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
          </p>
          <p className="text-sm text-[#717171]">
            {(booking.listings?.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong
          </p>
          {mode === "host" ? (
            <p className="mt-1 text-xs text-[#717171]">
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
                className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Godkänn
              </button>
              <button
                onClick={onDecline}
                disabled={busy}
                className="rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs font-semibold text-[#222222] disabled:opacity-50"
              >
                Avvisa
              </button>
            </div>
          ) : null}
          {mode === "renter" && booking.status === "pending" && onCancel ? (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs font-semibold text-[#222222] disabled:opacity-50"
            >
              Avboka
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
