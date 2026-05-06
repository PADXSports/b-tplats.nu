"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type ListingGalleryImage = {
  id: string | number;
  image_url: string;
  display_order: number;
  is_temp?: boolean;
};

type ListingImageUploaderProps = {
  listingId?: string | number;
  existingImages?: ListingGalleryImage[];
  onChange?: (images: ListingGalleryImage[]) => void;
};

export default function ListingImageUploader({
  listingId,
  existingImages = [],
  onChange,
}: ListingImageUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [images, setImages] = useState<ListingGalleryImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  useEffect(() => {
    onChange?.(images);
  }, [images, onChange]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    setUploading(true);
    const files = Array.from(event.target.files);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let nextImages = [...images];
    for (const file of files) {
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user?.id ?? "anon"}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("listing-images").upload(filePath, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);
      const imageUrl = data.publicUrl;

      if (listingId) {
        const { data: inserted } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listingId,
            image_url: imageUrl,
            display_order: nextImages.length,
          })
          .select("id, image_url, display_order")
          .single();

        if (inserted) {
          nextImages = [...nextImages, inserted as ListingGalleryImage];
          setImages(nextImages);
        }
      } else {
        nextImages = [
          ...nextImages,
          {
            id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            image_url: imageUrl,
            display_order: nextImages.length,
            is_temp: true,
          },
        ];
        setImages(nextImages);
      }
    }

    setUploading(false);
    event.target.value = "";
  };

  const handleDelete = async (image: ListingGalleryImage) => {
    const storagePath = image.image_url.split("/listing-images/")[1];
    if (storagePath) {
      await supabase.storage.from("listing-images").remove([storagePath]);
    }

    if (listingId && !String(image.id).startsWith("tmp-")) {
      await supabase.from("listing_images").delete().eq("id", image.id);
    }

    setImages((prev) => prev.filter((item) => String(item.id) !== String(image.id)));
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);
    const withOrder = nextImages.map((image, index) => ({ ...image, display_order: index }));
    setImages(withOrder);

    if (!listingId) return;
    for (const image of withOrder) {
      if (String(image.id).startsWith("tmp-")) continue;
      await supabase
        .from("listing_images")
        .update({ display_order: image.display_order })
        .eq("id", image.id);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-white">Bilder (ladda upp flera)</label>
      <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/20 bg-[#0b1b3f] px-4 py-2 text-sm font-semibold text-white">
        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        {uploading ? "Laddar upp..." : "Välj bilder"}
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <div key={String(image.id)} className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#0b1b3f]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.image_url} alt={`Bild ${index + 1}`} className="h-32 w-full object-cover" />
            <button
              onClick={() => void handleDelete(image)}
              className="absolute right-2 top-2 rounded-full bg-[#dc2626] p-1 text-white opacity-0 transition group-hover:opacity-100"
              type="button"
            >
              ×
            </button>
            {index > 0 ? (
              <button
                onClick={() => void handleReorder(index, index - 1)}
                className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs text-[#0f1f3d] opacity-0 transition group-hover:opacity-100"
                type="button"
              >
                ←
              </button>
            ) : null}
            {index === 0 ? (
              <span className="absolute bottom-2 left-2 rounded bg-[#0d9488] px-2 py-1 text-xs font-semibold text-white">
                Huvudbild
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-xs text-white/60">Den första bilden används som huvudbild. Använd pilen för att ändra ordning.</p>
    </div>
  );
}
