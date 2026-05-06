type Status = "pending" | "confirmed" | "declined" | "cancelled";

export default function StatusBadge({ status }: { status: Status }) {
  const colors = {
    pending: "bg-yellow-500/20 text-yellow-300",
    confirmed: "bg-green-500/20 text-green-300",
    declined: "bg-red-500/20 text-red-300",
    cancelled: "bg-gray-500/20 text-gray-300",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>
      {status === "pending" ? "Väntar" : status === "confirmed" ? "Bekräftad" : status === "declined" ? "Avslagen" : "Avbokad"}
    </span>
  );
}
