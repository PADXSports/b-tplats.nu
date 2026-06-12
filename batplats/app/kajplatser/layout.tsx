import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Båtplatser | Båtplats.nu",
  description: "Sök och boka båtplatser i Sverige. Filtrera på område, storlek och pris.",
};

export default function KajplatserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
