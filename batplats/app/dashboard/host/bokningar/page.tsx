import { redirect } from 'next/navigation';

export default function HostBookingsPage() {
  redirect('/dashboard/host?tab=bokningar');
}
