const defaultAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://b-tplats-nu.vercel.app";

export type RenterConfirmationParams = {
  renterName: string;
  listingTitle: string;
  harbourName: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  price: number | null;
  bookingId: string | number;
  appUrl?: string;
};

export function renterConfirmationEmail({
  renterName,
  listingTitle,
  harbourName,
  city,
  startDate,
  endDate,
  price,
  bookingId,
  appUrl = defaultAppUrl(),
}: RenterConfirmationParams): string {
  const priceLabel = price != null ? `${price.toLocaleString("sv-SE")}` : "—";
  const harbour = harbourName || "—";
  const cityPart = city || "—";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f1f3d; padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 1.5rem;">Båtplats.nu</h1>
      </div>
      <div style="padding: 32px; background: #f8fafc;">
        <h2 style="color: #0f1f3d; margin-top: 0;">Din bokning är bekräftad! ⚓</h2>
        <p style="color: #334155; line-height: 1.5;">Hej ${renterName || "där"}!</p>
        <p style="color: #334155; line-height: 1.5;">Tack för din bokning. Här är detaljerna:</p>
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #0d9488; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <p style="margin: 0 0 8px; color: #0f1f3d;"><strong>${listingTitle}</strong></p>
          <p style="margin: 0 0 8px; color: #475569;">${harbour}, ${cityPart}</p>
          <p style="margin: 0 0 8px; color: #475569;">Period: ${startDate} → ${endDate}</p>
          <p style="margin: 0 0 8px; color: #475569;">Pris: ${priceLabel} SEK</p>
          <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">Bokningsnummer: ${bookingId}</p>
        </div>
        <a href="${appUrl}/dashboard/renter"
           style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Se mina bokningar
        </a>
      </div>
    </div>
  `;
}

export type HostNotificationParams = {
  hostName: string;
  listingTitle: string;
  renterEmail: string;
  startDate: string;
  endDate: string;
  price: number | null;
  appUrl?: string;
};

export function hostNotificationEmail({
  hostName,
  listingTitle,
  renterEmail,
  startDate,
  endDate,
  price,
  appUrl = defaultAppUrl(),
}: HostNotificationParams): string {
  const priceLabel = price != null ? `${price.toLocaleString("sv-SE")}` : "—";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f1f3d; padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 1.5rem;">Båtplats.nu</h1>
      </div>
      <div style="padding: 32px; background: #f8fafc;">
        <h2 style="color: #0f1f3d; margin-top: 0;">Ny bokning på din båtplats! 🚤</h2>
        <p style="color: #334155; line-height: 1.5;">Hej ${hostName || "där"}!</p>
        <p style="color: #334155; line-height: 1.5;">Du har fått en ny bekräftad bokning via Båtplats.nu.</p>
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #0d9488; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <p style="margin: 0 0 8px; color: #0f1f3d;"><strong>${listingTitle}</strong></p>
          <p style="margin: 0 0 8px; color: #475569;">Gästens e-post: ${renterEmail || "—"}</p>
          <p style="margin: 0 0 8px; color: #475569;">Period: ${startDate} → ${endDate}</p>
          <p style="margin: 0 0 8px; color: #475569;">Pris (säsong): ${priceLabel} SEK</p>
        </div>
        <a href="${appUrl}/dashboard/host"
           style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Visa i dashboard
        </a>
      </div>
    </div>
  `;
}
