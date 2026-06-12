"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export default function BookingSuccessCheck() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0d9488] shadow-[0_8px_24px_rgba(13,148,136,0.35)] transition-all duration-500 ease-out ${
        visible ? "scale-100 opacity-100" : "scale-[0.65] opacity-0"
      }`}
    >
      <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden />
    </div>
  );
}
