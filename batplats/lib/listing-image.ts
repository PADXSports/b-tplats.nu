export const LISTING_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&h=700&fit=crop";

export const getListingImageSrc = (imageUrl: string | null | undefined) =>
  imageUrl ?? LISTING_PLACEHOLDER_IMAGE;
