import { redirect } from 'next/navigation';

export default function HostListingsPage() {
  redirect('/dashboard/host?tab=annonser');
}
